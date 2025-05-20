# Testing file that can be called from the backend to check if the files are being sent correctly.
import sys
import os

def main():
    print("Received files from backend:")

    for file_path in sys.argv[1:]:
        if os.path.exists(file_path):
            print(f"{os.path.basename(file_path)}")
        else:
            print(f"Missing: {file_path}")

if __name__ == "__main__":
    main()
