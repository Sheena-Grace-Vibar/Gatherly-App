import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidenavbar from "./Sidenavbar";
import Navbar from "./Navbar";
import Subnavbar from "./Subnavbar";
import CreateEvent from "./CreateEvent";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import axios from "axios";
import Itinerary from "./Itinerary";
import Chat from "./Chat";

const Dashboard = () => {
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [selectedSection, setSelectedSection] = useState("home");
  const [events, setEvents] = useState([]);
  const [upcomingEvent, setUpcomingEvent] = useState(null);
  const [itinerary, setItinerary] = useState([]);
  const [date, setDate] = useState(new Date());
  const userName = localStorage.getItem("name") || "Guest";
  const navigate = useNavigate();

  useEffect(() => {
    if (selectedFamily) {
      fetchEvents(selectedFamily._id);
    } else {
      setEvents([]);
      setItinerary([]);
    }
  }, [selectedFamily]);

  const fetchEvents = async (familyGroupId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `https://gatherly-app.onrender.com/api/events/family-group/${familyGroupId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log("Fetched Events:", response.data);
      const eventsData = response.data.events;
      setEvents(eventsData);
      findUpcomingEvent(eventsData);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  const calculateDaysUntilEvent = (eventDate) => {
    const today = new Date();
    const eventDateTime = new Date(eventDate);
    const diffTime = eventDateTime - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const findUpcomingEvent = (events) => {
    const today = new Date();
    const upcomingEvents = events
      .filter((event) => new Date(event.date) > today)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    if (upcomingEvents.length > 0) {
      setUpcomingEvent(upcomingEvents[0]);
    }
  };

  const getEventsForDate = (selectedDate) => {
    return events.filter((event) => {
      const eventDate = new Date(event.date);
      return (
        eventDate.getFullYear() === selectedDate.getFullYear() &&
        eventDate.getMonth() === selectedDate.getMonth() &&
        eventDate.getDate() === selectedDate.getDate()
      );
    });
  };

  const handleDateChange = (newDate) => {
    setDate(newDate);
  };

  const eventsForDate = getEventsForDate(date);

  return (
    <div>
      <Navbar />
      <div style={{ display: "flex" }}>
        <Sidenavbar onFamilySelect={setSelectedFamily} />
        <div style={{ flex: 1, padding: "20px" }}>
          <Subnavbar
            selectedFamily={selectedFamily}
            onSelectSection={setSelectedSection}
            selectedSection={selectedSection} // Pass selectedSection
          />
          <div>
            {selectedFamily ? (
              <div>
                {selectedSection === "home" && (
                  <>
                    {selectedFamily.photo && (
                      <div>
                        <img
                          src={selectedFamily.photo}
                          alt={`${selectedFamily.family_name} Family`}
                          className="w-full h-[400px] object-cover"
                        />
                      </div>
                    )}
                    {upcomingEvent && (
                      <div className="mt-20 p-5 rounded-lg">
                        <h3 className="text-7xl font-bold text-center mb-10 text-[#FF6F00]">
                          Upcoming Event
                        </h3>
                        <p className="text-4xl text-center mb-3">
                          <strong>{upcomingEvent.title}</strong> is happening in{" "}
                          <span className="text-[#FF6F00] font-bold">
                            {calculateDaysUntilEvent(upcomingEvent.date)} days
                            📣
                          </span>
                          !
                        </p>
                        <p className="text-center text-2xl">
                          Event Date:{" "}
                          {new Date(upcomingEvent.date).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )}
                        </p>
                      </div>
                    )}
                  </>
                )}

                {selectedSection === "events" && (
                  <div className="mt-10">
                    <h3 className="text-6xl font-bold text-center mb-10 text-[#FF6F00]">
                      Events Calendar
                    </h3>
                    <div className="flex flex-col">
                      <div className="w-3/4">
                        <CreateEvent
                          selectedFamily={selectedFamily}
                          onEventCreated={() => fetchEvents(selectedFamily._id)}
                        />
                      </div>
                      <Calendar
                        onChange={handleDateChange}
                        value={date}
                        className={"w-3/4"}
                      />
                    </div>
                    <h4 className="text-4xl text-center mt-20 font-bold">
                      Events on {date.toDateString()}:
                    </h4>
                    {eventsForDate.length > 0 ? (
                      <div className="flex justify-center">
                        <ul className="text-center border-2 border-[#FF6F00] rounded-md mt-10 p-5 w-[500px]">
                          {eventsForDate.map((event) => (
                            <li key={event._id} className="text-3xl">
                              <strong className="text-[#FF6F00]">
                                {event.title}
                              </strong>
                              <br />
                              {event.description}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-center text-2xl mt-10">
                        No events for this date.
                      </p>
                    )}
                  </div>
                )}

                {selectedSection === "itinerary" && (
                  <Itinerary itinerary={itinerary} />
                )}

                <Chat familyId={selectedFamily._id} />
              </div>
            ) : (
              <div className="mx-auto flex flex-col p-[50px]">
                <img
                  src="/assets/images/Team spirit-cuate.svg"
                  alt="Login Illustration"
                  className="w-[800px]"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
