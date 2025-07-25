import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { MdDashboard, MdPeople, MdEvent, MdMedication, MdDescription, MdAccessTime, MdLogout, MdPerson, MdHistory, MdInsights } from 'react-icons/md';

export default function Sidebar({ role, onSectionChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [userInfo, setUserInfo] = useState({ name: '', user_id: '', hospital: '' });
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      if (window.innerWidth > 768) setIsOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchUserInfo = async () => {
      const userId = localStorage.getItem('userId');
      if (userId) {
        try {
          const res = await axios.get(`http://localhost:5000/users/${userId}`);
          const user = res.data;
          let hospitalName = '';
          if (user.role === 'hospital') {
            hospitalName = user.name || 'Not Assigned';
          } else if (user.hospital_user_id) {
            try {
              const hospitalRes = await axios.get(`http://localhost:5000/users/${user.hospital_user_id}`);
              hospitalName = hospitalRes.data.name || 'Not Assigned';
            } catch {
              hospitalName = 'Not Assigned';
            }
          } else {
            hospitalName = '';
          }
          setUserInfo({
            name: user.name || 'Unknown User',
            user_id: userId,
            hospital: role === 'admin' ? '' : (hospitalName || 'Not Assigned')
          });
        } catch (err) {
          console.error('Error fetching user info:', err);
          setUserInfo({
            name: 'Unknown User',
            user_id: userId,
            hospital: role === 'admin' ? '' : 'Not Assigned'
          });
        }
      }
    };
    fetchUserInfo();
  }, [role]);

  const toggleSidebar = () => setIsOpen(!isOpen);

  const handleLogout = () => {
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    navigate('/');
  };

  const menuItems = {
    admin: [
      { name: 'Dashboard', section: 'dashboard', icon: <MdDashboard size={20} /> },
      { name: 'Manage Users', section: 'users', icon: <MdPeople size={20} /> },
      { name: 'Appointments', section: 'appointments', icon: <MdEvent size={20} /> },
      { name: 'Prescriptions', section: 'prescriptions', icon: <MdMedication size={20} /> },
      { name: 'Medical Records', section: 'medical_records', icon: <MdDescription size={20} /> },
      { name: 'Recent Activity', section: 'recent_activity', icon: <MdHistory size={20} /> },
    ],
    doctor: [
      { name: 'Dashboard', section: 'dashboard', icon: <MdDashboard size={20} /> },
      { name: 'Profile', section: 'profile', icon: <MdPerson size={20} /> },
      { name: 'Appointments', section: 'appointments', icon: <MdEvent size={20} /> },
      { name: 'Prescriptions', section: 'prescriptions', icon: <MdMedication size={20} /> },
      { name: 'Medical Records', section: 'records', icon: <MdDescription size={20} /> },
      { name: 'Availability', section: 'availability', icon: <MdAccessTime size={20} /> },
    ],
    patient: [
      { name: 'Dashboard', section: 'dashboard', icon: <MdDashboard size={20} /> },
      { name: 'Profile', section: 'profile', icon: <MdPerson size={20} /> },
      { name: 'Appointments', section: 'appointments', icon: <MdEvent size={20} /> },
      { name: 'Prescriptions', section: 'prescriptions', icon: <MdMedication size={20} /> },
      { name: 'Medical Records', section: 'records', icon: <MdDescription size={20} /> },
      { name: 'Prediction', section: 'risk', icon: <MdDescription size={20} /> },

    ],
  };

  return (
    <>
      <button 
        onClick={toggleSidebar}
        className="md:hidden fixed top-4 left-4 z-20 bg-gray-800 text-white p-2 rounded-md"
      >
        {isOpen ? '✕' : '☰'}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-10 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      <div 
        className={`fixed top-0 left-0 w-64 h-screen bg-gray-800 text-white transition-all duration-300 z-20 
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
      >
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">NetCurea</h2>
          <div className="mt-2 text-sm">
            <p className="font-medium">{userInfo.name}</p>
            <p className="text-gray-300">ID: {userInfo.user_id}</p>
            {role !== 'admin' && userInfo.hospital && (
              <p className="text-gray-300">Hospital: {userInfo.hospital}</p>
            )}
          </div>
          <button className="md:hidden text-white absolute top-4 right-4" onClick={toggleSidebar}>✕</button>
        </div>
        
        <ul className="mt-4">
          {menuItems[role].map((item) => (
            <li key={item.section}>
              <button
                className="flex items-center w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors"
                onClick={() => {
                  onSectionChange(item.section);
                  if (windowWidth <= 768) setIsOpen(false);
                }}
              >
                <span className="mr-3">{item.icon}</span>
                {item.name}
              </button>
            </li>
          ))}
          <li className="border-t border-gray-700 mt-2">
            <button 
              className="flex items-center w-full px-4 py-3 text-left text-red-400 hover:bg-gray-700 transition-colors"
              onClick={handleLogout}
            >
              <span className="mr-3"><MdLogout size={20} /></span> Logout
            </button>
          </li>
        </ul>
      </div>
    </>
  );
}