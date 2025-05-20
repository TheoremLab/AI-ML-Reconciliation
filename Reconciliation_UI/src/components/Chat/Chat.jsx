import React, { useState, useEffect } from "react";
import styles from "./Chat.module.css";
// import { saveFile, getAllFiles } from '../../storage'; 

const Chat = () => {
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [showIndustries, setShowIndustries] = useState(false);
  const [showDBConfig, setShowDBConfig] = useState(false);
  const [industrySearch, setIndustrySearch] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [conversations, setConversations] = useState(() => {
    const saved = localStorage.getItem("conversations");
    return saved ? JSON.parse(saved) : [];
  });
  const [activeChatId, setActiveChatId] = useState(null);

  // If you want to keep track of uploaded files across renders in the future, expand this functionality
  const uploadedFilesRef = React.useRef([]);

  const username = localStorage.getItem("username") || "User";

  useEffect(() => {
    localStorage.setItem("conversations", JSON.stringify(conversations));
  }, [conversations]);

  const industries = [
    "Aerospace and Defense", "Agriculture", "Artificial Intelligence (AI) Software and Services", "Automotive Industry",
    "Basic Metal Production", "Biotechnology", "Chemical Industries", "Cloud Services", "Commerce (Wholesale and Retail Trade)",
    "Construction", "Cybersecurity", "E-commerce", "Education", "Electric Vehicles (EVs)", "Electronics and Electrical Equipment Manufacturing",
    "Financial Services", "Fishing and Aquaculture", "Food and Beverage Manufacturing", "Forestry", "Healthcare", "Hospitality and Tourism",
    "Information Technology (IT) and Telecommunications", "Machinery and Equipment Manufacturing", "Media and Entertainment", "Mining and Quarrying",
    "Obesity Drugs", "Oil and Gas Extraction", "Other Services", "Professional Services", "Public Administration", "Real Estate",
    "Renewable Energy", "Robotics", "Space Industry", "Textiles, Apparel, and Footwear", "Transportation and Logistics", "Utilities", "Wood and Paper Products"
  ];

  const filteredIndustries = industries.filter(ind =>
    ind.toLowerCase().includes(industrySearch.toLowerCase())
  );

  // Function to get the targeted files based on keywords to send to backend
  const getTargetedFiles = (messages) => {
    const keywords = [
      "plan_sponsor",
      "recordkeeper",
      "tpa_report",
      "statement_output",
      "plan_rules"
    ];

    const found = {};

    // Go through all messages to collect matching files
    for (const msg of messages) {
      if (msg.sender !== "user" || !msg.files) continue;

      for (const file of msg.files) {
        for (const keyword of keywords) {
          if (
            file.name.toLowerCase().includes(keyword) &&
            !found[keyword]
          ) {
            found[keyword] = {
              name: file.name,
              content: file.content, // full base64 string (e.g., data:text/csv;base64,...)
            };
          }
        }
      }
    }

    // Return just the first matching file for each keyword
    return Object.values(found);
  };

  // Function to send the targeted files to the backend
  const sendTargetedFilesToBackend = async (allMessages, setChatMessages, activeChatId, setConversations) => {
    const selectedFiles = getTargetedFiles(allMessages);
    console.log("Entered sendTargetedFilesToBackend");

    if (selectedFiles.length === 0) {
      console.warn("No matching files found.");
      const systemMessage = {
        sender: "system",
        text: "No matching files found to analyze.",
        files: []
      };
      setChatMessages(prev => [...prev, systemMessage]);
      return;
    }
    try {
      const response = await fetch("http://localhost:5000/submit-batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ files: selectedFiles })
      });

      const data = await response.json();
      console.log("Backend response:", data);

      const systemMessage = {
        sender: "system",
        text: data.result,
        files: []
      };

      setChatMessages(prev => [...prev, systemMessage]);

      if (activeChatId) {
        setConversations(prev =>
          prev.map(c =>
            c.id === activeChatId
              ? { ...c, messages: [...prev, systemMessage] }
              : c
          )
        );
      }
    } catch (err) {
      console.error("Failed to send files:", err);

      const errorMessage = {
        sender: "system",
        text: "Failed to send files to backend.",
        files: []
      };

      setChatMessages(prev => [...prev, errorMessage]);
    }
  };

  // Get the most recent message (from the user) that includes files
  function getLastUploadedFiles(chatMessages) {
    const reversed = [...chatMessages].reverse();
    for (const msg of reversed) {
      if (msg.sender === "user" && msg.files && msg.files.length > 0) {
        return msg.files;
      }
    }
    return [];
  }

  function getAllUploadedFiles(chatMessages) {
    return chatMessages
      .filter(m => m.sender === "user" && m.files?.length)
      .flatMap(m => m.files);
  }


  useEffect(() => {
  console.log("Updated uploadedFiles state:", uploadedFiles);
}, [uploadedFiles]);

  // check if the browser supports persistent storage
  // and request it if it does. Currently everything is stored in localStorage
  useEffect(() => {
    const requestPersistence = async () => {
      if (navigator.storage && navigator.storage.persist) {
        const granted = await navigator.storage.persist();
        if (!granted) {
          console.log("Browser did not grant persistent storage. Your data may be cleared automatically.");
        } else {
          console.log("Persistent storage granted.");
        }
      }
    };
    requestPersistence();
  }, []);


const handleUpload = () => {
  const input = document.createElement("input");
  input.type = "file";
  input.multiple = true;

  input.onchange = async (event) => {
    const files = Array.from(event.target.files);

    const fileReaders = files.map(file => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            name: file.name,
            type: file.type,
            size: file.size,
            content: reader.result,
          });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });

    const newFiles = await Promise.all(fileReaders);

    // Update both ref and state
    uploadedFilesRef.current = [...uploadedFilesRef.current, ...newFiles];
    setUploadedFiles([...uploadedFilesRef.current]);

    setShowIndustries(false);
  };

  input.click();
};


  const handleSend = () => {
    if (!chatInput.trim() && uploadedFiles.length === 0) return;

    const newMessage = {
      sender: "user",
      text: chatInput,
      files: uploadedFiles
    };

    // Add the new message to the list of messages
    const updatedMessages = [...chatMessages, newMessage];
    setChatMessages(updatedMessages);
    
    // debug stuff
    console.log("Chat messages:", updatedMessages);
    window.updatedMessages = updatedMessages;

    // Check if the message contains the word "analyze" and send files to backend if it does
    if (chatInput.toLowerCase().includes("analyze")) {
      sendTargetedFilesToBackend(
        [...chatMessages, newMessage],
        setChatMessages,
        activeChatId,
        setConversations
      );
    }

    if (activeChatId) {
      setConversations(prev =>
        prev.map(c =>
          c.id === activeChatId ? { ...c, messages: updatedMessages } : c
        )
      );
    } else {
      const newId = Date.now().toString();
      const newTitle = newMessage.text.slice(0, 20) || "Untitled Chat";
      const newConversation = {
        id: newId,
        title: newTitle,
        messages: updatedMessages
      };
      setConversations(prev => [...prev, newConversation]);
      setActiveChatId(newId);
    }

    setChatInput("");
    setUploadedFiles([]);
    uploadedFilesRef.current = [];
  };

  const handleNewChat = () => {
    if (chatMessages.length > 0 && activeChatId === null) {
      const newTitle = chatMessages[0]?.text.slice(0, 20) || "Untitled Chat";

      const previous = {
        id: Date.now().toString(),
        title: newTitle,
        messages: chatMessages
      };

      setConversations(prev => [...prev, previous]);
    } else if (chatMessages.length > 0 && activeChatId) {
      setConversations(prev =>
        prev.map(c =>
          c.id === activeChatId ? { ...c, messages: chatMessages } : c
        )
      );
    }

    setChatMessages([]);
    setUploadedFiles([]);
    setChatInput("");
    setActiveChatId(null);
  };

  const loadConversation = (id) => {
    const found = conversations.find(c => c.id === id);
    if (found) {
      setChatMessages(found.messages);
      setActiveChatId(id);
    }
  };

  const handleDeleteChat = (id) => {
    setConversations(prev => prev.filter(conv => conv.id !== id));
    if (activeChatId === id) {
      setChatMessages([]);
      setActiveChatId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("username");
    window.location.href = "/";
  };

  return (
    <div className={styles.chatContainer}>
      <aside className={styles.sidebar}>
        <h2>Reconciliation.ai</h2>
        <button className={styles.newChat} onClick={handleNewChat}>New Chat +</button>
        <div className={styles.recent}>
          <h4>Recent</h4>
          <ul>
            {conversations.map(conv => (
              <li
                key={conv.id}
                className={`${conv.id === activeChatId ? styles.activeChat : ""} ${styles.chatListItem}`}
                onClick={() => loadConversation(conv.id)}
              >
                {conv.title}
                <button className={styles.deleteChatButton} onClick={(e) => {
                  e.stopPropagation(); // Prevent loading the chat when deleting
                  handleDeleteChat(conv.id);
                }}>
                  ✖
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className={styles.mainArea}>
        <div className={styles.topNav}>
          <button className={styles.logout} onClick={handleLogout}>Logout</button>
        </div>

        <div className={styles.welcome}>
          <h1 className={styles.gradientText}>Hello {username}</h1>
          <p>Ask me anything about your report</p>
        </div>

        <div className={styles.messageList}>
          {chatMessages.map((msg, idx) => (
            <div
              key={idx}
              className={`${styles.messageBubble} ${msg.sender === "system" ? styles.system : styles.user}`}
            >
              <div>{msg.text}</div>
              {msg.files && msg.files.length > 0 && (
                <ul className={styles.fileList}>
                  {msg.files.map((file, i) => (
                    <li key={i}>
                      <a href={`data:${file.type};base64,${file.content}`} download={file.name}>
                        {file.name}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>


        {showIndustries && (
          <div className={styles.industries}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search industries..."
              value={industrySearch}
              onChange={(e) => setIndustrySearch(e.target.value)}
            />
            <div className={styles.industryList}>
              {filteredIndustries.map((industry) => (
                <button key={industry} onClick={handleUpload}>
                  {industry}
                </button>
              ))}
            </div>
          </div>
        )}

        {showDBConfig && (
          <div className={styles.dbConfig}>
            <h3>Database Configuration</h3>
            <input type="text" placeholder="Server Type..." />
            <input type="text" placeholder="Host Name..." />
            <input type="text" placeholder="Port..." />
            <input type="text" placeholder="Database..." />
            <input type="text" placeholder="Username..." />
            <input type="password" placeholder="Password..." />
            <div className={styles.dbButtons}>
              <button>Save</button>
              <button onClick={() => setShowDBConfig(false)}>Cancel</button>
            </div>
          </div>
        )}

        <div className={styles.chatBar}>
          <button onClick={() => setShowIndustries(!showIndustries)}>+</button>

          <div className={styles.inputContainer}>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message..."
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />

            {uploadedFiles.length > 0 && (
              <div className={styles.uploadedFilesContainer}>
                {uploadedFiles.map((file, idx) => (
                  <div key={idx} className={styles.fileDisplay}>
                    {file.name}
                    <span className={styles.removeFile} onClick={() => setUploadedFiles(uploadedFiles.filter((_, i) => i !== idx))}>✖</span>
                  </div>
                ))}
              </div>
            )}
          </div>


          <button onClick={handleSend}>Send</button>

          <button onClick={() => setShowDBConfig(true)}>
            <img src="/assets/Database/database.png" alt="Database Icon" />
          </button>
        </div>
      </main>
    </div>
  );
};

export default Chat;