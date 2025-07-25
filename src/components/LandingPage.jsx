import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { FaUser, FaStethoscope, FaLock, FaBell, FaSearch, FaInfoCircle, FaEnvelope, FaPhone, FaCopy } from 'react-icons/fa';
import axios from 'axios';
import MediCareLogo from '../assets/MediCare.jpeg';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const [hoveredHospital, setHoveredHospital] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Chatbot State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      text: "Hello! I'm the NetCurea AI Assistant. I can help with hospital information, registration, login, or tell you the current time. Ask me anything! (e.g., 'Find the hospital Apollo', 'Register as a doctor', 'Help me log in')",
      sender: 'bot'
    }
  ]);
  const [input, setInput] = useState('');

  // Fetch hospitals from backend
  useEffect(() => {
    const fetchHospitals = async () => {
      try {
        const response = await axios.get('http://localhost:5000/hospitals', {
          timeout: 5000, // 5-second timeout
        });
        console.log('Raw backend response:', response.data); // Debug log
        if (Array.isArray(response.data)) {
          const validHospitals = response.data.map(h => ({
            _id: h._id || `temp_${Math.random().toString(36).substr(2, 9)}`, // Fallback _id
            name: h.name || 'Unnamed Hospital',
            location: h.location || 'Location not available',
            phone: h.phone || null,
            email: h.email || null,
          }));
          console.log('Processed hospitals:', validHospitals); // Debug log
          setHospitals(validHospitals);
        } else {
          console.error('Backend response is not an array:', response.data);
          setHospitals([]);
          setError('Invalid data format from backend');
        }
        setLoading(false);
      } catch (err) {
        console.error('Fetch error:', err.message, err.response?.status, err.response?.data);
        setError(`Failed to fetch hospitals: ${err.message}. Status: ${err.response?.status || 'N/A'}`);
        setHospitals([]);
        setLoading(false);
      }
    };
    fetchHospitals();
  }, []);

  // Helper function to sanitize search query
  const sanitizedQuery = (query) => query.replace(/[<>;&]/g, '').trim().toLowerCase();

  // Chatbot: Handle specific user queries
  const processUserInput = (input) => {
    const lowerInput = sanitizedQuery(input);

    // Doctor registration query
    if (lowerInput.includes('register as a doctor') || lowerInput.includes('doctor registration')) {
      return {
        text: (
          <span>
            To register as a doctor, please contact our admin at{' '}
            <a href="mailto:medigrids@gmail.com" className="text-teal-300 hover:underline">
              medigrids@gmail.com
            </a>
          </span>
        ),
        sender: 'bot'
      };
    }

    // Login help query
    if (lowerInput.includes('help me log in') || lowerInput.includes('how to log in')) {
      return {
        text: (
          <div>
            To log in and book an appointment, follow these steps:
            <ol className="list-decimal list-inside mt-2">
              <li>Log in as a patient using your credentials</li>
              <li>Navigate to the Appointments section</li>
              <li>Select from available doctors</li>
              <li>Choose your preferred date and time</li>
              <li>Confirm and book your appointment</li>
            </ol>
          </div>
        ),
        sender: 'bot'
      };
    }

    // Hospital search query
    if (lowerInput.includes('find') && (lowerInput.includes('hospital') || lowerInput.includes('hospitals'))) {
      let searchTerm = lowerInput.replace('find', '').replace('the', '').replace('hospital', '').replace('hospitals', '').trim();
      searchTerm = sanitizedQuery(searchTerm);
      console.log('Search term:', searchTerm); // Debug log
      console.log('Available hospitals:', hospitals); // Debug log

      if (loading) {
        return { text: 'Loading hospital data...', sender: 'bot' };
      }
      if (error || !hospitals.length) {
        return {
          text: error || 'No hospital data available. Please ensure the backend is running and returning data.',
          sender: 'bot'
        };
      }

      const foundHospitals = hospitals.filter(h => 
        h.name && sanitizedQuery(h.name).includes(searchTerm)
      );

      if (foundHospitals.length > 0) {
        return {
          text: (
            <div>
              Found {foundHospitals.length} hospital(s) matching "{searchTerm}":
              <ul className="list-disc list-inside mt-2">
                {foundHospitals.map(h => (
                  <li key={h._id}>
                    {h.name} - {h.location}
                    {h.email && (
                      <span>
                        {' '}(Contact: <a href={`mailto:${h.email}`} className="text-teal-300 hover:underline">{h.email}</a>)
                      </span>
                    )}
                    {h.phone && <span>, Phone: {h.phone}</span>}
                  </li>
                ))}
              </ul>
            </div>
          ),
          sender: 'bot'
        };
      }
      return {
        text: `No hospitals found matching "${searchTerm}". Please check the spelling or try a different hospital name.`,
        sender: 'bot'
      };
    }

    // Time query
    if (lowerInput.includes('what time is it') || lowerInput.includes('current time')) {
      return null; // Handled by Gemini API
    }

    return null;
  };

  // Chatbot: Send message to Gemini API
  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const sanitizedInput = input.replace(/[<>;&]/g, '');
    const userMessage = { text: sanitizedInput, sender: 'user' };
    setMessages((prev) => [...prev, userMessage]);

    const processedResponse = processUserInput(sanitizedInput);
    if (processedResponse) {
      setMessages((prev) => [...prev, processedResponse]);
    } else {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        setMessages((prev) => [
          ...prev,
          {
            text: (
              <span>
                API key is missing. Please configure the Gemini API key in your .env file as VITE_GEMINI_API_KEY.
              </span>
            ),
            sender: 'bot'
          }
        ]);
        return;
      }

      try {
        console.log('Sending request to Gemini API with input:', sanitizedInput);
        const conversationHistory = messages.map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: typeof msg.text === 'string' ? msg.text : msg.text.toString() }]
        }));
        conversationHistory.push({ role: 'user', parts: [{ text: sanitizedInput }] });

        const response = await axios.post(
          'https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent',
          {
            contents: conversationHistory
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            }
          }
        );

        const botResponseText = response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I couldn’t process that.';
        console.log('Gemini API response:', botResponseText);
        const botResponse = { text: botResponseText, sender: 'bot' };
        setMessages((prev) => [...prev, botResponse]);
      } catch (error) {
        console.error('Gemini API error:', error.response?.data || error.message);
        setMessages((prev) => [
          ...prev,
          {
            text: (
              <span>
                Sorry, there was an error with the API. Please contact our admin at{' '}
                <a href="mailto:medigrids@gmail.com" className="text-teal-300 hover:underline">
                  medigrids@gmail.com
                </a>. Error: {error.message}
              </span>
            ),
            sender: 'bot'
          }
        ]);
      }
    }

    setInput('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('medigrids@gmail.com')
      .then(() => alert('Admin email copied to clipboard!'))
      .catch((err) => console.error('Failed to copy email:', err));
  };

  const handleHospitalClick = (hospitalName) => {
    navigate('/login', { state: { hospitalName } });
  };

  const filteredHospitals = hospitals.filter(
    (h) =>
      h.name.toLowerCase().includes(sanitizedQuery(searchQuery)) ||
      h.location?.toLowerCase().includes(sanitizedQuery(searchQuery))
  );

  const testimonials = [
    {
      name: 'Dr. Vaishali Chopra',
      role: 'Psychiatrist',
      text: 'MediGrid has transformed how we manage patient care, making scheduling and records seamless.'
    },
    {
      name: 'Rohan Malik',
      role: 'Patient',
      text: 'Booking appointments and accessing my records has never been easier, thanks to MediGrid.'
    },
    {
      name: 'Sevens',
      role: 'Hospital Admin',
      text: 'The platform\'s security and real-time notifications have streamlined our operations.'
    }
  ];

  const features = [
    {
      title: 'Patient Management',
      description: 'Streamline patient records, appointments, and billing with ease.',
      icon: <FaUser className="text-4xl text-teal-400" />
    },
    {
      title: 'Doctor Scheduling',
      description: 'Effortlessly manage doctor availability and appointments.',
      icon: <FaStethoscope className="text-4xl text-teal-400" />
    },
    {
      title: 'Secure Records',
      description: 'Ensure patient data privacy with advanced security protocols.',
      icon: <FaLock className="text-4xl text-teal-400" />
    },
    {
      title: 'Real-Time Notifications',
      description: 'Instant updates for appointment changes and urgent alerts.',
      icon: <FaBell className="text-4xl text-teal-400" />
    }
  ];

  const services = [
    {
      title: 'Emergency Care',
      description: '24/7 emergency services with rapid response teams.',
      icon: <FaStethoscope className="text-4xl text-teal-400" />
    },
    {
      title: 'Telemedicine',
      description: 'Virtual consultations with top specialists from home.',
      icon: <FaUser className="text-4xl text-teal-400" />
    },
    {
      title: 'Diagnostic Services',
      description: 'Advanced imaging and lab tests for accurate diagnoses.',
      icon: <FaSearch className="text-4xl text-teal-400" />
    },
    {
      title: 'Surgical Procedures',
      description: 'State-of-the-art surgical facilities and expert surgeons.',
      icon: <FaLock className="text-4xl text-teal-400" />
    }
  ];

  const latestNews = [
    {
      title: 'New AI Diagnostic Tool Launched',
      date: 'June 20, 2025',
      text: 'MediGrid introduces an AI-powered diagnostic tool to enhance accuracy in early detection.'
    },
    {
      title: 'Partnership with PGIMER',
      date: 'June 15, 2025',
      text: 'Collaboration with PGIMER to expand healthcare access in Northern India.'
    },
    {
      title: 'Mobile App Update',
      date: 'June 10, 2025',
      text: 'Latest MediGrid app update includes real-time appointment tracking.'
    }
  ];

  const cardVariants = {
    hover: { scale: 1.08, y: -6, boxShadow: '0px 16px 32px rgba(0, 0, 0, 0.25)', transition: { duration: 0.4, ease: 'easeOut' } },
    initial: { scale: 1, boxShadow: '0px 6px 12px rgba(0, 0, 0, 0.15)' }
  };

  const fadeIn = {
    hidden: { opacity: 0, y: 60 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: 'easeOut' } }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-teal-800 to-teal-950 text-white font-sans flex flex-col">
      <div id="particles-js" className="fixed inset-0 z-0"></div>

      <header className="flex justify-between items-center px-6 py-4 bg-gradient-to-r from-purple-900 to-teal-800 shadow-lg fixed w-full top-0 z-10">
        <div className="flex items-center space-x-3">
          <img src={MediCareLogo} alt="NetCurea Logo" className="w-12 h-12 rounded-full" />
          <h1 className="text-2xl font-bold text-teal-200">NetCurea</h1>
        </div>
        <motion.button
          whileHover={{ scale: 1.1, boxShadow: '0px 8px 24px rgba(0, 255, 255, 0.3)' }}
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate('/login')}
          className="px-6 py-2 bg-teal-500 text-white rounded-full hover:bg-teal-400 transition-all shadow-md text-base"
        >
          Login
        </motion.button>
      </header>

      <main className="flex-grow pt-16 pb-16">
        <motion.section initial="hidden" animate="visible" variants={fadeIn} className="text-center px-4 py-8">
          <h1 className="text-6xl font-extrabold mb-6 tracking-tight bg-gradient-to-r from-white via-teal-200 to-teal-400 text-transparent bg-clip-text">
            NetCurea – Connected Care, Redefined
          </h1>
          <p className="max-w-3xl mx-auto text-xl text-teal-100 leading-relaxed">
            Empowering India's healthcare with a seamless, secure, and innovative platform for hospitals, doctors, and patients.
          </p>
        </motion.section>

        <DotLottieReact
          src="https://lottie.host/f21ab7c6-3115-45ea-8b65-a76bb137bcb8/rLAM13LDhe.lottie"
          loop
          autoplay
        />

        <motion.section initial="hidden" animate="visible" variants={fadeIn} className="px-4 py-16">
          <h2 className="text-5xl font-bold text-center mb-10 text-white drop-shadow-xl">About Us</h2>
          <div className="max-w-4xl mx-auto text-center text-teal-100 text-lg">
            NetCurea is a pioneering healthcare platform designed to revolutionize patient care across India. Founded with a vision to bridge gaps in healthcare accessibility, we connect hospitals, doctors, and patients through a secure, user-friendly ecosystem. Our mission is to enhance medical services with cutting-edge technology, ensuring quality care for all.
          </div>
        </motion.section>

        <motion.section initial="hidden" animate="visible" variants={fadeIn} className="px-4 py-16">
          <h2 className="text-5xl font-bold text-center mb-10 text-white drop-shadow-xl">Why NetCurea Stands Out</h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto">
            {features.map((f, i) => (
              <motion.div
                key={i}
                variants={cardVariants}
                initial="initial"
                whileHover="hover"
                className="bg-white bg-opacity-15 backdrop-blur-xl border border-teal-300/30 text-white p-8 rounded-3xl shadow-xl transition-all text-center"
              >
                <div className="mb-6">{f.icon}</div>
                <h3 className="text-2xl font-semibold mb-3">{f.title}</h3>
                <p className="text-base text-teal-100">{f.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section initial="hidden" animate="visible" variants={fadeIn} className="px-4 py-16">
          <h2 className="text-5xl font-bold text-center mb-10 text-white drop-shadow-xl">Our Services</h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 max-w-7xl mx-auto">
            {services.map((s, i) => (
              <motion.div
                key={i}
                variants={cardVariants}
                initial="initial"
                whileHover="hover"
                className="bg-white bg-opacity-15 backdrop-blur-xl border border-teal-300/30 text-white p-8 rounded-3xl shadow-xl transition-all text-center"
              >
                <div className="mb-6">{s.icon}</div>
                <h3 className="text-2xl font-semibold mb-3">{s.title}</h3>
                <p className="text-base text-teal-100">{s.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section initial="hidden" animate="visible" variants={fadeIn} className="px-4 py-16">
          <h2 className="text-5xl font-bold text-center mb-10 text-white drop-shadow-xl">Find Our Partner Hospitals</h2>
          <div className="max-w-2xl mx-auto mb-10">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by hospital name or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full py-4 px-6 pl-12 bg-white bg-opacity-20 rounded-full text-white placeholder-teal-200 border border-teal-300/50 focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
              <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-teal-400" />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-10">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-400"></div>
              <p className="mt-4 text-teal-200">Loading hospitals...</p>
            </div>
          ) : error ? (
            <div className="text-center py-10 text-red-300">
              <FaInfoCircle className="inline-block text-4xl mb-4" />
              <p>{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-6 py-2 bg-teal-500 rounded-lg hover:bg-teal-600 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-w-7xl mx-auto">
                {filteredHospitals.map((h) => (
                  <motion.div
                    key={h._id}
                    variants={cardVariants}
                    initial="initial"
                    whileHover="hover"
                    onHoverStart={() => setHoveredHospital(h._id)}
                    onHoverEnd={() => setHoveredHospital(null)}
                    onClick={() => handleHospitalClick(h.name)}
                    className="bg-white bg-opacity-15 backdrop-blur-xl border border-teal-300/30 text-white p-8 rounded-3xl shadow-xl cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-center h-24 w-full bg-teal-500 bg-opacity-40 rounded-xl mb-6 text-3xl font-bold text-teal-200">
                      {h.name[0]}
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{h.name}</h3>
                    <p className="text-sm text-teal-100">Location: {h.location}</p>
                    <p className="text-sm text-teal-100 mt-1">Contact: {h.phone || 'Not available'}</p>
                    <p className="text-sm text-teal-200 mt-1">Email: {h.email || 'Not available'}</p>
                    {hoveredHospital === h._id && (
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="mt-6 bg-black bg-opacity-40 p-6 rounded-xl"
                      >
                        <button
                          onClick={() => handleHospitalClick(h.name)}
                          className="mt-4 w-full py-3 bg-teal-500 hover:bg-teal-600 rounded-lg font-medium text-sm transition-all"
                        >
                          Login to {h.name}
                        </button>
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>
              {filteredHospitals.length === 0 && !loading && (
                <p className="text-center text-teal-200 text-lg">
                  No hospitals found. Try asking the chatbot for hospital information!
                </p>
              )}
            </>
          )}
        </motion.section>

        <motion.section initial="hidden" animate="visible" variants={fadeIn} className="px-4 py-16">
          <h2 className="text-5xl font-bold text-center mb-10 text-white drop-shadow-xl">Latest News</h2>
          <div className="grid gap-8 sm:grid-cols-1 lg:grid-cols-3 max-w-6xl mx-auto">
            {latestNews.map((n, i) => (
              <motion.div
                key={i}
                variants={cardVariants}
                initial="initial"
                whileHover="hover"
                className="bg-white bg-opacity-15 backdrop-blur-xl border border-teal-300/30 text-white p-8 rounded-3xl shadow-xl"
              >
                <h3 className="text-xl font-semibold mb-2">{n.title}</h3>
                <p className="text-sm text-teal-200 mb-4">{n.date}</p>
                <p className="text-base text-teal-100">{n.text}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section initial="hidden" animate="visible" variants={fadeIn} className="px-4 py-16">
          <h2 className="text-5xl font-bold text-center mb-10 text-white drop-shadow-xl">What Our Users Say</h2>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
            {testimonials.map((t, i) => (
              <motion.div
                key={i}
                variants={cardVariants}
                initial="initial"
                whileHover="hover"
                className="bg-white bg-opacity-15 backdrop-blur-xl border border-teal-300/30 text-white p-8 rounded-3xl shadow-xl"
              >
                <p className="text-sm text-teal-100 mb-4">"{t.text}"</p>
                <h3 className="text-lg font-semibold">{t.name}</h3>
                <p className="text-sm text-teal-200">{t.role}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section initial="hidden" animate="visible" variants={fadeIn} className="px-4 py-16">
          <h2 className="text-5xl font-bold text-center mb-10 text-white drop-shadow-xl">Contact Us</h2>
          <div className="max-w-4xl mx-auto text-center text-teal-100 text-lg">
            <p>
              <FaEnvelope className="inline mr-2" /> Email: <a href="mailto:medigrids@gmail.com" className="text-teal-300 hover:underline">medigrids@gmail.com</a>
              <button
                onClick={handleCopyEmail}
                className="ml-2 text-teal-400 hover:text-teal-300"
                title="Copy email"
              >
                <FaCopy />
              </button>
            </p>
            <p>
              <FaPhone className="inline mr-2" /> Phone: +91-123-456-7890
            </p>
            <p>Address: NetCurea HQ, 123 Healthcare Lane, New Delhi, India</p>
          </div>
        </motion.section>
      </main>

      <footer className="flex justify-between items-center px-6 py-4 bg-gradient-to-r from-purple-900 to-teal-800 shadow-lg fixed w-full bottom-0 z-10">
        <p className="text-lg text-teal-200">© 2025 NetCurea. All rights reserved.</p>
      </footer>

      <div className="fixed bottom-4 right-8 z-50">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-end"
        >
          {isChatOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="w-80 h-96 bg-white bg-opacity-20 backdrop-blur-lg rounded-lg shadow-2xl p-4 mb-4 flex flex-col border border-teal-300/50"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-teal-200">NetCurea AI Assistant</h3>
                <button
                  onClick={() => setIsChatOpen(false)}
                  className="text-teal-200 hover:text-teal-400"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-y-auto mb-4 p-2 bg-black bg-opacity-30 rounded-lg">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`mb-2 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}
                  >
                    <span
                      className={`inline-block p-2 rounded-lg ${msg.sender === 'user'
                        ? 'bg-teal-500 text-white'
                        : 'bg-white bg-opacity-30 text-teal-100'
                        }`}
                    >
                      {msg.text}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about hospitals, registration, login, or time..."
                  className="flex-1 p-2 rounded-l-lg bg-white bg-opacity-20 text-white placeholder-teal-200 border border-teal-300/50 focus:outline-none"
                />
                <button
                  onClick={handleSendMessage}
                  className="p-2 bg-teal-500 text-white rounded-r-lg hover:bg-teal-600"
                >
                  Send
                </button>
              </div>
            </motion.div>
          )}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="w-12 h-12 bg-teal-500 rounded-full flex items-center justify-center shadow-lg"
          >
            <FaEnvelope className="text-xl" />
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}