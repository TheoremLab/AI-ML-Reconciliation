import React, { useState, useEffect } from "react";
import styles from "./Chat.module.css";

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

  const handleUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;

    input.onchange = (event) => {
      const files = Array.from(event.target.files);
      const fileReaders = files.map(file => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              name: file.name,
              type: file.type,
              size: file.size,
              content: reader.result.split(',')[1] // Remove the data URL prefix
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });

      Promise.all(fileReaders).then(fileData => {
        setUploadedFiles(prev => [...prev, ...fileData]);
      });
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

    const updatedMessages = [...chatMessages, newMessage];
    setChatMessages(updatedMessages);

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
            <div key={idx} className={styles.messageBubble}>
              <div>{msg.text}</div>
              {msg.files && msg.files.length > 0 && (
                <ul className={styles.fileList}>
                  {msg.files.map((file, i) => (
                    <li key={i}>
                       <a href={`data:${file.type};base64,${file.content}`} download={file.name}>{file.name}</a>
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