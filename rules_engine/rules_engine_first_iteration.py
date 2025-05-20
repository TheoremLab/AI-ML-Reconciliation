import sys
import base64
import pandas as pd
import json
from io import StringIO
import os
from tabulate import tabulate

# === Configuration, currently unused ===
DATA_DIR = "../data"

CSV_FILES = {
    "plan_sponsor_feed": "plan_sponsor_feed_2000.csv",
    "recordkeeper_db": "recordkeeper_db_2000_corrected.csv",
    "tpa_report": "tpa_reports_2000.csv",
    "statement_output": "statement_output_file_2000.csv",
    "plan_rules_repo": "plan_rules_repository_2000_expanded.csv"
}


def load_csvs(data_dir, file_map):
    dataframes = {}
    for key, filename in file_map.items():
        file_path = os.path.join(data_dir, filename)
        if os.path.exists(file_path):
            print(f"Found: {file_path}")
            df = pd.read_csv(file_path)
            dataframes[key] = df
        else:
            print(f"Missing: {file_path}")
            dataframes[key] = None
    return dataframes


def check_employee_id_consistency(df_a, df_b, df_c, name_a, name_b, name_c):
    # Ensure all contain EmployeeID
    missing = [name for df, name in zip([df_a, df_b, df_c], [name_a, name_b, name_c]) if 'EmployeeID' not in df.columns]
    if missing:
        print(f"Error: The following datasets are missing 'EmployeeID': {', '.join(missing)}")
        return

    ids_a = set(df_a['EmployeeID'].dropna().astype(str))
    ids_b = set(df_b['EmployeeID'].dropna().astype(str))
    ids_c = set(df_c['EmployeeID'].dropna().astype(str))

    all_ids = ids_a.union(ids_b).union(ids_c)

    missing_in_a = all_ids - ids_a
    missing_in_b = all_ids - ids_b
    missing_in_c = all_ids - ids_c

    if missing_in_a:
        print(f"\nEmployeeIDs missing in {name_a}:")
        for eid in sorted(missing_in_a):
            print(f"  {eid}")

    if missing_in_b:
        print(f"\nEmployeeIDs missing in {name_b}:")
        for eid in sorted(missing_in_b):
            print(f"  {eid}")

    if missing_in_c:
        print(f"\nEmployeeIDs missing in {name_c}:")
        for eid in sorted(missing_in_c):
            print(f"  {eid}")

    if not missing_in_a and not missing_in_b and not missing_in_c:
        print("\nPlan Sponsor Feed, Recordkeeper DB, and Statement Output File datasets have consistent EmployeeID coverage.")


def check_duplicate_transaction_ids(tpa_df):
    if 'TransactionID' not in tpa_df.columns:
        print("Error: TPA report is missing the 'TransactionID' column.")
        return

    duplicates = tpa_df['TransactionID'].dropna().astype(str)
    duplicated_txids = duplicates[duplicates.duplicated(keep=False)]

    if not duplicated_txids.empty:
        print("\nDuplicate TransactionIDs found in TPA Report:")
        counts = duplicated_txids.value_counts()
        for txid, count in counts.items():
            print(f"  TransactionID {txid} appears {count} times")
    else:
        print("\nNo duplicate TransactionIDs found in TPA Report.")


def check_semantic_duplicate_loans(tpa_df):
    required_columns = {"EmployeeID", "Date", "LoanDisbursement"}
    missing = required_columns - set(tpa_df.columns)
    if missing:
        print(f"Error: TPA report is missing required columns: {', '.join(missing)}")
        return

    tpa_df = tpa_df.dropna(subset=["EmployeeID", "Date", "LoanDisbursement"])
    tpa_df["EmployeeID"] = tpa_df["EmployeeID"].astype(str)
    tpa_df["Date"] = pd.to_datetime(tpa_df["Date"], errors="coerce")
    tpa_df["LoanDisbursement"] = pd.to_numeric(tpa_df["LoanDisbursement"], errors="coerce")

    flagged = []

    grouped = tpa_df.groupby(["EmployeeID", "Date"])
    for (emp_id, date), group in grouped:
        if len(group) > 1:
            loan_values = group["LoanDisbursement"].values
            for i in range(len(loan_values)):
                for j in range(i + 1, len(loan_values)):
                    if abs(loan_values[i] - loan_values[j]) <= 1.0:
                        flagged.append(group)
                        break
                if flagged and flagged[-1].equals(group):
                    break

    if flagged:
        print("\nPotential semantic duplicate loan entries found in TPA Report:")
        for group in flagged:
            print(group)
            print("-" * 40)
    else:
        print("\nNo semantic duplicate loan entries found in TPA Report.")


def check_contribution_limits(sponsor_df, rules_df):
    required_sponsor_cols = {"EmployeeID", "PlanID", "ContributionAmount"}
    required_rules_cols = {"PlanID", "MaxContributionLimit"}

    missing_sponsor = required_sponsor_cols - set(sponsor_df.columns)
    missing_rules = required_rules_cols - set(rules_df.columns)

    if missing_sponsor:
        print(f"Error: Plan Sponsor Feed is missing columns: {', '.join(missing_sponsor)}")
        return
    if missing_rules:
        print(f"Error: Plan Rules Repository is missing columns: {', '.join(missing_rules)}")
        return

    sponsor_df = sponsor_df.dropna(subset=["EmployeeID", "PlanID", "ContributionAmount"])
    sponsor_df["EmployeeID"] = sponsor_df["EmployeeID"].astype(str)
    sponsor_df["PlanID"] = sponsor_df["PlanID"].astype(str)
    sponsor_df["ContributionAmount"] = pd.to_numeric(sponsor_df["ContributionAmount"], errors="coerce")

    rules_df["PlanID"] = rules_df["PlanID"].astype(str)
    rules_df["MaxContributionLimit"] = pd.to_numeric(rules_df["MaxContributionLimit"], errors="coerce")

    # Merge sponsor feed with rules to get max limits
    merged = sponsor_df.groupby(["EmployeeID", "PlanID"], as_index=False)["ContributionAmount"].sum()
    merged = pd.merge(merged, rules_df[["PlanID", "MaxContributionLimit"]], on="PlanID", how="left")

    # Flag rows where contribution exceeds plan max
    violations = merged[merged["ContributionAmount"] > merged["MaxContributionLimit"]]

    if not violations.empty:
        print("\nContribution limit violations found:")
        print(violations)
    else:
        print("\nNo contribution limit violations found between plan sponsor feed and plan rules repository.")


def check_balance_consistency(statement_df, recordkeeper_df):
    required_statement_cols = {"EmployeeID", "FinalBalance"}
    required_recordkeeper_cols = {"EmployeeID", "AccountBalance"}

    missing_statement = required_statement_cols - set(statement_df.columns)
    missing_recordkeeper = required_recordkeeper_cols - set(recordkeeper_df.columns)

    if missing_statement:
        print(f"Error: Statement Output File is missing columns: {', '.join(missing_statement)}")
        return
    if missing_recordkeeper:
        print(f"Error: RecordKeeper DB is missing columns: {', '.join(missing_recordkeeper)}")
        return

    statement_df = statement_df.dropna(subset=["EmployeeID", "FinalBalance"])
    recordkeeper_df = recordkeeper_df.dropna(subset=["EmployeeID", "AccountBalance"])

    statement_df["EmployeeID"] = statement_df["EmployeeID"].astype(str)
    recordkeeper_df["EmployeeID"] = recordkeeper_df["EmployeeID"].astype(str)

    statement_df["FinalBalance"] = pd.to_numeric(statement_df["FinalBalance"], errors="coerce")
    recordkeeper_df["AccountBalance"] = pd.to_numeric(recordkeeper_df["AccountBalance"], errors="coerce")

    merged = pd.merge(statement_df, recordkeeper_df, on="EmployeeID", how="inner")

    mismatches = merged[abs(merged["FinalBalance"] - merged["AccountBalance"]) > 1.0]

    if not mismatches.empty:
        print("\nFinalBalance and AccountBalance mismatches found between Statement Output File and Recordkeeper DB:")
        print()
        print(mismatches[["EmployeeID", "FinalBalance", "AccountBalance"]].head(10).to_markdown(index=False))
        print("\n[Showing first 10 of {} rows]".format(len(mismatches)))
    else:
        print("\nAll FinalBalance values match AccountBalance within $1 tolerance.")


def check_loan_disbursement_vs_outstanding(tpa_df, recordkeeper_df, tolerance=1.0):
    required_tpa_cols = {"EmployeeID", "LoanDisbursement"}
    required_rk_cols = {"EmployeeID", "LoanOutstanding"}

    missing_tpa = required_tpa_cols - set(tpa_df.columns)
    missing_rk = required_rk_cols - set(recordkeeper_df.columns)

    if missing_tpa:
        print(f"Error: TPA Report is missing columns: {', '.join(missing_tpa)}")
        return
    if missing_rk:
        print(f"Error: Recordkeeper DB is missing columns: {', '.join(missing_rk)}")
        return

    tpa_df = tpa_df.dropna(subset=["EmployeeID", "LoanDisbursement"])
    recordkeeper_df = recordkeeper_df.dropna(subset=["EmployeeID", "LoanOutstanding"])

    tpa_df["EmployeeID"] = tpa_df["EmployeeID"].astype(str)
    recordkeeper_df["EmployeeID"] = recordkeeper_df["EmployeeID"].astype(str)

    tpa_df["LoanDisbursement"] = pd.to_numeric(tpa_df["LoanDisbursement"], errors="coerce")
    recordkeeper_df["LoanOutstanding"] = pd.to_numeric(recordkeeper_df["LoanOutstanding"], errors="coerce")

    tpa_grouped = tpa_df.groupby("EmployeeID", as_index=False)["LoanDisbursement"].sum()
    merged = pd.merge(tpa_grouped, recordkeeper_df[["EmployeeID", "LoanOutstanding"]], on="EmployeeID", how="inner")

    mismatches = merged[abs(merged["LoanDisbursement"] - merged["LoanOutstanding"]) > tolerance]

    if not mismatches.empty:
        print("Loan disbursement totals do not match loan outstanding values (tolerance > $1):")
        print("Affected files: tpa_report, recordkeeper_db")
        print()
        preview = mismatches.head(10)
        print(tabulate(preview, headers="keys", tablefmt="github", showindex=False))
        print(f"\n[Showing first 10 of {len(mismatches)} mismatches]")
    else:
        print("No mismatches found between LoanDisbursement and LoanOutstanding within tolerance range.")


def main():
    # print("entered backend script")

    expected_keys = {
        "plan_sponsor": "plan_sponsor_feed",
        "recordkeeper": "recordkeeper_db",
        "tpa_report": "tpa_report",
        "statement_output": "statement_output",
        "plan_rules": "plan_rules_repo"
    }

    # Step 1: Parse CLI args into a dictionary
    file_paths = {}
    for arg in sys.argv[1:]:
        if "=" in arg:
            key, path = arg.split("=", 1)
            file_paths[key.strip()] = path.strip()

    # Step 2: Load each expected file or report an error
    dfs = {}
    missing_files = []

    for key, df_key in expected_keys.items():
        path = file_paths.get(key)
        if not path:
            missing_files.append(f"Missing argument for `{key}` file.")
            dfs[df_key] = None
            continue

        if not os.path.exists(path):
            missing_files.append(f"File not found at path: {path}")
            dfs[df_key] = None
            continue

        try:
            dfs[df_key] = pd.read_csv(path)
        except Exception as e:
            missing_files.append(f"Failed to load `{key}` from {path}: {e}")
            dfs[df_key] = None

    # Step 3: Report status of all files
    # print("File Load Summary:")
    # for key, df_key in expected_keys.items():
    #     path = file_paths.get(key)
    #     if dfs[df_key] is not None:
    #         print(f"  [OK] {df_key} loaded from: {path}")
    #     else:
    #         if not path:
    #             print(f"  [Missing Argument] No path provided for: {df_key}")
    #         elif not os.path.exists(path):
    #             print(f"  [Not Found] Expected file at: {path}")
    #         else:
    #             print(f"  [Failed to Load] {df_key} from: {path}")

    # print("")  # blank line before validations


    # Step 4: Run checks conditionally
    if all(dfs.get(k) is not None for k in ["plan_sponsor_feed", "recordkeeper_db", "statement_output"]):
        check_employee_id_consistency(
            dfs["plan_sponsor_feed"], dfs["recordkeeper_db"], dfs["statement_output"],
            "Plan Sponsor", "Recordkeeper", "Statement Output"
        )

    if dfs["tpa_report"] is not None:
        check_duplicate_transaction_ids(dfs["tpa_report"])
        check_semantic_duplicate_loans(dfs["tpa_report"])

    if dfs["plan_sponsor_feed"] is not None and dfs["plan_rules_repo"] is not None:
        check_contribution_limits(dfs["plan_sponsor_feed"], dfs["plan_rules_repo"])

    if dfs["statement_output"] is not None and dfs["recordkeeper_db"] is not None:
        check_balance_consistency(dfs["statement_output"], dfs["recordkeeper_db"])

    if dfs["tpa_report"] is not None and dfs["recordkeeper_db"] is not None:
        check_loan_disbursement_vs_outstanding(dfs["tpa_report"], dfs["recordkeeper_db"])


if __name__ == "__main__":
    main()
