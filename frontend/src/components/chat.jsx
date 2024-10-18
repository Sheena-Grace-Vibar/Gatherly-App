import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { IoIosSend } from "react-icons/io";

const socket = io("http://localhost:3000"); // Update this URL for your backend deployment

const Chat = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const navigate = useNavigate();
  const [familyGroup, setFamilyGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [msname, setMsname] = useState(""); // Initialize with an empty string
  const [ava, setAva] = useState(""); // Initialize with an empty string
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsLoggedIn(true);
      const fetchFamilyGroup = async () => {
        try {
          const response = await axios.get(
            "http://localhost:3000/api/family-group/mine",
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          const group = response.data.familyGroup;
          setFamilyGroup(group);
          console.log("Fetched family group:", group);

          // Set msname and ava to the family name and photo if available
          if (group) {
            if (group.family_name) {
              setMsname(group.family_name);
            }
            if (group.photo) {
              setAva(group.photo);
            }

            // Request messages for this family group
            socket.emit("loadMessages", group._id);
          }
        } catch (error) {
          console.error("Error fetching family group:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchFamilyGroup();
    } else {
      setIsLoggedIn(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    socket.on("newMessage", (message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    socket.on("previousMessages", (previousMessages) => {
      setMessages(previousMessages);
    });

    return () => {
      socket.off("newMessage");
      socket.off("previousMessages");
    };
  }, []);

  const sendMessage = () => {
    if (input && familyGroup) {
      const message = {
        familyGroupId: familyGroup._id,
        msname,
        ava,
        message: input,
        timestamp: new Date().toISOString(),
      };
      socket.emit("sendMessage", message);
      setInput(""); // Clear input after sending
    }
  };

  const clearChat = () => {
    setMessages([]); // Clear messages
  };

  const handleClick = () => {
    setIsActive(!isActive); // Toggle chat visibility
  };

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!isLoggedIn) {
    return <p>Please log in to access the chat.</p>;
  }

  return (
    <div className="chatmain">
      <div className={`chatField ${isActive ? "active" : "inactive"}`}>
        <div className="Gtxt" onClick={handleClick}>
         {msname ? `${msname} Chat` : "Group Chat"}
        </div>
        <div className="chatContainer">
          <div>
            {messages.length > 0 ? (
              messages.map((msg, index) => (
                <div key={index} className="chatBox">
                  {/* <img
                    src={msg.ava}
                    alt={msg.msname}
                    className="loggedAvatar"
                  /> */}
                  <span style={{ fontWeight: "bold" }}>{msg.msname}:</span>
                  <span>{msg.message}</span>
                  <span
                    style={{
                      marginLeft: "10px",
                      fontSize: "0.8em",
                      color: "#999",
                    }}
                  >
                    {msg.timestamp
                      ? new Date(msg.timestamp).toLocaleString()
                      : "Just now"}
                  </span>
                </div>
              ))
            ) : (
              <p>No messages yet. Start the conversation!</p>
            )}
          </div>

          <div className="flex mt-5 fixed bottom-1 bg-white p-2 left-1">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  sendMessage();
                }
              }}

              className="w-full border-2 border-white"
              placeholder="Type here...."
            />

            <IoIosSend
              className="text-[50px] cursor-pointer text-[#FF6F00] ml-3"
              onClick={sendMessage}
            />
          </div>

          {/* <button onClick={clearChat} className="chatBtn">
            Clear Chat
          </button> */}
        </div>
      </div>
    </div>
  );
};

export default Chat;
