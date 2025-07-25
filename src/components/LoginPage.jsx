import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { FaUser, FaLock, FaHospital, FaPhone, FaEnvelope, FaUserMd, FaVenusMars } from 'react-icons/fa';
import MediCareLogo from '../assets/MediCare.jpeg';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

export default function LoginPage() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [role, setRole] = useState('doctor');
  const [name, setName] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [hospitals, setHospitals] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchHospitals = async () => {
      try {
        const response = await axios.get('http://localhost:5000/hospitals');
        setHospitals(response.data);
        setLoading(false);
      } catch (err) {
        setError(err.response?.data?.message || err.message);
        setLoading(false);
        console.error('Error fetching hospitals:', err);
      }
    };

    fetchHospitals();
  }, []);

  useEffect(() => {
    const hospitalFromState = location.state?.hospitalName || '';
    setSelectedHospital(hospitalFromState);
    if (hospitalFromState) {
      localStorage.setItem('selectedHospital', hospitalFromState);
    }
  }, [location.state]);

  const generateUserId = (role) => {
    const uuid = uuidv4().replace(/-/g, '').slice(0, 8);
    switch (role) {
      case 'doctor': return `DC_${uuid}`;
      case 'patient': return `PT_${uuid}`;
      case 'hospital': return `HP_${uuid}`;
      default: throw new Error('Invalid role for user ID generation');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (userId === 'AD_root') {
      setIsAdmin(true);
    } else if (!userId.match(/^(DC_|PT_|HP_)\d+$/)) {
      setError('Invalid user ID format. Use AD_root for admin or a valid ID starting with DC_, PT_, or HP_ followed by a number.');
      setLoading(false);
      return;
    }

    if (!isAdmin && !selectedHospital) {
      setError('Please select a hospital.');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post('http://localhost:5000/login', { user_id: userId, password });
      const { role } = response.data;
      localStorage.setItem('userRole', role);
      localStorage.setItem('userId', userId);

      if (role === 'admin') {
        navigate('/admin');
      } else if (role === 'doctor') {
        navigate('/doctor');
      } else if (role === 'patient') {
        navigate('/patient');
      } else if (role === 'hospital') {
        navigate('/hospital');
      } else {
        setError('Unknown role returned from server.');
      }

      if (selectedHospital && !isAdmin) {
        localStorage.setItem('selectedHospital', selectedHospital);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Check user ID and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!selectedHospital) {
      setError('Please select a hospital.');
      setLoading(false);
      return;
    }

    if (!name) {
      setError('Name is required.');
      setLoading(false);
      return;
    }

    if (role === 'doctor' && !specialization) {
      setError('Specialization is required for doctors.');
      setLoading(false);
      return;
    }

    try {
      const user_id = generateUserId(role);
      const userData = {
        user_id,
        password,
        role,
        name,
        specialization: role === 'doctor' ? specialization : undefined,
        phone: phone || undefined,
        email: email || undefined,
        age: age || undefined,
        gender: gender || undefined,
        hospital_user_id: role === 'doctor' || role === 'patient' ? selectedHospital : undefined,
      };

      const response = await axios.post('http://localhost:5000/register', userData);
      setError(response.data.message || 'Registration successful! Please log in.');
      setIsRegistering(false);
      setUserId(user_id);
      setPassword('');
      setName('');
      setSpecialization('');
      setPhone('');
      setEmail('');
      setAge('');
      setGender('');
    } catch (err) {
      setError(err.response?.data?.message || `Registration failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    setError('');
    setUserId('');
    setPassword('');
    setName('');
    setSpecialization('');
    setPhone('');
    setEmail('');
    setAge('');
    setGender('');
    setIsAdmin(false);
  };

  const cardVariants = {
    hover: { scale: 1.05, y: -5, boxShadow: '0px 12px 24px rgba(0, 0, 0, 0.2)', transition: { duration: 0.3, ease: 'easeOut' } },
    initial: { scale: 1, boxShadow: '0px 6px 12px rgba(0, 0, 0, 0.15)' }
  };

  const fadeIn = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-emerald-800 to-teal-950 text-white font-sans flex flex-col">
      {/* Header */}
      <header className="flex justify-between items-center px-6 py-4 bg-gradient-to-r from-purple-900 to-emerald-800 shadow-lg fixed w-full top-0 z-10 ">
        <div className="flex items-center space-x-3">
          <img src={MediCareLogo} alt="NetCurea Logo" className="w-12 h-12 rounded-full" />
          <h1 className="text-2xl font-bold text-emerald-200">NetCurea</h1>
        </div>
        <div className="flex items-center space-x-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="hidden sm:block"
          >
            <DotLottieReact
              src="https://lottie.host/f21ab7c6-3115-45ea-8b65-a76bb137bcb8/rLAM13LDhe.lottie"
              style={{ width: '60px', height: '60px' }}
              loop
              autoplay
            />
          </motion.div>
          <motion.button
            whileHover={{ scale: 1.1, boxShadow: '0px 8px 24px rgba(0, 255, 255, 0.3)' }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-emerald-500 text-white rounded-full hover:bg-emerald-400 transition-all shadow-md text-base"
          >
            Home
          </motion.button>
        </div>
      </header>

      {/* Main Content */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeIn}
        className="flex-grow flex items-center justify-center p-4 sm:p-6 pt-20 mt-20"
      >
        <motion.div
          variants={cardVariants}
          initial="initial"
          whileHover="hover"
          className="bg-white bg-opacity-15 backdrop-blur-xl border border-emerald-300/30 rounded-3xl shadow-xl p-8 w-full max-w-lg text-white pt-20 mt-20"
        >
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <img src={MediCareLogo} alt="NetCurea Logo" className="w-24 h-24 rounded-full border-2 border-emerald-300 shadow-lg object-contain" />
            </div>
            <h2 className="text-3xl font-bold text-emerald-200 tracking-tight">
              {isRegistering ? 'Join NetCurea' : 'Welcome Back'}
            </h2>
            <p className="text-base text-emerald-100 mt-2">
              {isRegistering
                ? 'Create your account to access NetCurea'
                : userId === 'AD_root'
                  ? 'Admin Dashboard Access'
                  : selectedHospital
                    ? `Accessing ${selectedHospital}`
                    : 'Sign in to your dashboard'}
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-6 p-3 bg-red-500 bg-opacity-20 text-red-200 text-sm rounded-lg text-center border border-red-300/30"
            >
              {error}
            </motion.div>
          )}

          <div className="space-y-4">
            {!isRegistering && (
              <>
                {userId !== 'AD_root' && (
                  <div className="space-y-2">
                    <label htmlFor="hospital" className="block text-sm font-medium text-emerald-100">
                      Hospital
                    </label>
                    <div className="relative">
                      <FaHospital className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-400" />
                      <select
                        id="hospital"
                        className="w-full pl-10 pr-4 py-2 bg-white bg-opacity-20 border border-emerald-300/50 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:outline-none text-sm text-white placeholder-emerald-200 transition-all"
                        value={selectedHospital}
                        onChange={(e) => {
                          setSelectedHospital(e.target.value);
                          localStorage.setItem('selectedHospital', e.target.value);
                        }}
                        required={userId !== 'AD_root'}
                      >
                        <option value="" className="bg-emerald-900">Select a hospital</option>
                        {hospitals.map((hospital) => (
                          <option key={hospital.user_id} value={hospital.name} className="bg-emerald-900">
                            {hospital.name} - {hospital.location || 'No location'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <label htmlFor="userId" className="block text-sm font-medium text-emerald-100">
                    User ID
                  </label>
                  <div className="relative">
                    <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-400" />
                    <input
                      id="userId"
                      type="text"
                      className="w-full pl-10 pr-4 py-2 bg-white bg-opacity-20 border border-emerald-300/50 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:outline-none text-sm text-white placeholder-emerald-200 transition-all"
                      placeholder="e.g., AD_root, DC_..., PT_..., HP_..."
                      value={userId}
                      onChange={(e) => {
                        setUserId(e.target.value);
                        setIsAdmin(e.target.value === 'AD_root');
                      }}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="password" className="block text-sm font-medium text-emerald-100">
                    Password
                  </label>
                  <div className="relative">
                    <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-400" />
                    <input
                      id="password"
                      type="password"
                      className="w-full pl-10 pr-4 py-2 bg-white bg-opacity-20 border border-emerald-300/50 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:outline-none text-sm text-white placeholder-emerald-200 transition-all"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: '0px 8px 24px rgba(0, 255, 255, 0.3)' }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  className="w-full py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-emerald-700 disabled:cursor-not-allowed text-sm font-semibold transition-all"
                  disabled={loading}
                  onClick={handleLogin}
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </motion.button>
              </>
            )}

            {isRegistering && (
              <>
                <div className="space-y-2">
                  <label htmlFor="hospital" className="block text-sm font-medium text-emerald-100">
                    Hospital
                  </label>
                  <div className="relative">
                    <FaHospital className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-400" />
                    <select
                      id="hospital"
                      className="w-full pl-10 pr-4 py-2 bg-white bg-opacity-20 border border-emerald-300/50 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:outline-none text-sm text-white placeholder-emerald-200 transition-all"
                      value={selectedHospital}
                      onChange={(e) => {
                        setSelectedHospital(e.target.value);
                        localStorage.setItem('selectedHospital', e.target.value);
                      }}
                      required
                    >
                      <option value="" className="bg-emerald-900">Select a hospital</option>
                      {hospitals.map((hospital) => (
                        <option key={hospital.user_id} value={hospital.name} className="bg-emerald-900">
                          {hospital.name} - {hospital.location || 'No location'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="role" className="block text-sm font-medium text-emerald-100">
                    Role
                  </label>
                  <div className="relative">
                    <FaUserMd className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-400" />
                    <select
                      id="role"
                      className="w-full pl-10 pr-4 py-2 bg-white bg-opacity-20 border border-emerald-300/50 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:outline-none text-sm text-white placeholder-emerald-200 transition-all"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      required
                    >
                      <option value="doctor">Doctor</option>
                      <option value="patient">Patient</option>
                      <option value="hospital">Hospital</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="name" className="block text-sm font-medium text-emerald-100">
                    Name
                  </label>
                  <div className="relative">
                    <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-400" />
                    <input
                      id="name"
                      type="text"
                      className="w-full pl-10 pr-4 py-2 bg-white bg-opacity-20 border border-emerald-300/50 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:outline-none text-sm text-white placeholder-emerald-200 transition-all"
                      placeholder="Enter your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>
                {role === 'doctor' && (
                  <div className="space-y-2">
                    <label htmlFor="specialization" className="block text-sm font-medium text-emerald-100">
                      Specialization
                    </label>
                    <div className="relative">
                      <FaUserMd className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-400" />
                      <input
                        id="specialization"
                        type="text"
                        className="w-full pl-10 pr-4 py-2 bg-white bg-opacity-20 border border-emerald-300/50 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:outline-none text-sm text-white placeholder-emerald-200 transition-all"
                        placeholder="Enter specialization"
                        value={specialization}
                        onChange={(e) => setSpecialization(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}
                {(role === 'doctor' || role === 'patient') && (
                  <>
                    <div className="space-y-2">
                      <label htmlFor="age" className="block text-sm font-medium text-emerald-100">
                        Age
                      </label>
                      <div className="relative">
                        <FaUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-400" />
                        <input
                          id="age"
                          type="number"
                          className="w-full pl-10 pr-4 py-2 bg-white bg-opacity-20 border border-emerald-300/50 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:outline-none text-sm text-white placeholder-emerald-200 transition-all"
                          placeholder="Enter age"
                          value={age}
                          onChange={(e) => setAge(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="gender" className="block text-sm font-medium text-emerald-100">
                        Gender
                      </label>
                      <div className="relative">
                        <FaVenusMars className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-400" />
                        <select
                          id="gender"
                          className="w-full pl-10 pr-4 py-2 bg-white bg-opacity-20 border border-emerald-300/50 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:outline-none text-sm text-white placeholder-emerald-200 transition-all"
                          value={gender}
                          onChange={(e) => setGender(e.target.value)}
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <label htmlFor="phone" className="block text-sm font-medium text-emerald-100">
                    Phone
                  </label>
                  <div className="relative">
                    <FaPhone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-400" />
                    <input
                      id="phone"
                      type="text"
                      className="w-full pl-10 pr-4 py-2 bg-white bg-opacity-20 border border-emerald-300/50 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:outline-none text-sm text-white placeholder-emerald-200 transition-all"
                      placeholder="Enter phone number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-medium text-emerald-100">
                    Email
                  </label>
                  <div className="relative">
                    <FaEnvelope className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-400" />
                    <input
                      id="email"
                      type="email"
                      className="w-full pl-10 pr-4 py-2 bg-white bg-opacity-20 border border-emerald-300/50 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:outline-none text-sm text-white placeholder-emerald-200 transition-all"
                      placeholder="Enter email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label htmlFor="password" className="block text-sm font-medium text-emerald-100">
                    Password
                  </label>
                  <div className="relative">
                    <FaLock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-400" />
                    <input
                      id="password"
                      type="password"
                      className="w-full pl-10 pr-4 py-2 bg-white bg-opacity-20 border border-emerald-300/50 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:outline-none text-sm text-white placeholder-emerald-200 transition-all"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: '0px 8px 24px rgba(0, 255, 255, 0.3)' }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  className="w-full py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:bg-emerald-700 disabled:cursor-not-allowed text-sm font-semibold transition-all"
                  disabled={loading}
                  onClick={handleRegister}
                >
                  {loading ? 'Registering...' : 'Register'}
                </motion.button>
              </>
            )}

            <div className="text-center">
              <button
                onClick={toggleMode}
                className="text-emerald-200 hover:text-emerald-100 text-sm underline focus:outline-none"
              >
                {isRegistering ? 'Already have an account? Sign In' : 'Need an account? Register'}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}