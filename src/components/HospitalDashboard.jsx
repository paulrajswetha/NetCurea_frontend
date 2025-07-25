import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import jsPDF from 'jspdf';
import { MdDashboard, MdPeople, MdEvent, MdEdit, MdLogout } from 'react-icons/md';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import 'leaflet/dist/leaflet.css';
import 'leaflet-geosearch/dist/geosearch.css';

// Fix for default marker icon in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function HospitalDashboardWithSidebar() {
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [hospitalProfile, setHospitalProfile] = useState({
    name: '',
    about: '',
    address: '',
    lat: 0,
    lng: 0,
    phone: '',
    email: ''
  });
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editHospitalProfile, setEditHospitalProfile] = useState({
    name: '',
    about: '',
    address: '',
    email: '',
    phone: ''
  });
  const [loading, setLoading] = useState({
    doctors: true,
    appointments: false,
    patients: false,
    profile: false,
  });
  const [message, setMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [userInfo, setUserInfo] = useState({ name: '', user_id: '', hospital: '' });
  const [activeSection, setActiveSection] = useState('dashboard');
  const navigate = useNavigate();
  const userId = localStorage.getItem('userId');
  const role = localStorage.getItem('userRole') || 'hospital';
  const [mapCenter, setMapCenter] = useState([51.505, -0.09]); // Default fallback coordinates (London)
  const [markerPosition, setMarkerPosition] = useState(null);

  // Geocode the address when hospitalProfile.location.address changes
  useEffect(() => {
  if (hospitalProfile.address) {
    const provider = new OpenStreetMapProvider();
    provider.search({ query: hospitalProfile.address }).then((results) => {
      if (results && results.length > 0) {
        const { x, y } = results[0]; // x is longitude, y is latitude
        setMapCenter([y, x]);
        setMarkerPosition([y, x]);
      } else {
        console.warn('No geocoding results found for address:', hospitalProfile.address);
        setMarkerPosition(null);
      }
    }).catch((err) => {
      console.error('Geocoding error:', err);
      setMarkerPosition(null);
    });
  }
}, [hospitalProfile.address]);

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
      if (userId) {
        try {
          const res = await axios.get(`http://localhost:5000/users/${userId}`);
          const user = res.data;
          setUserInfo({
            name: user.name || 'Unknown User',
            user_id: userId,
            hospital: user.name || 'Not Assigned'
          });
        } catch (err) {
          console.error('Error fetching user info:', err);
          setUserInfo({
            name: 'Unknown User',
            user_id: userId,
            hospital: 'Not Assigned'
          });
        }
      }
    };
    fetchUserInfo();
  }, [userId]);

  useEffect(() => {
    if (!userId || !userId.startsWith('HP_')) {
      setMessage('Invalid hospital user ID. Please log in again.');
      console.error('HospitalDashboard: Invalid or missing user_id in localStorage');
      return;
    }
    fetchHospitalProfile();
    fetchDoctors();
    fetchAppointments();
    fetchPatients();
  }, [userId]);

  const fetchHospitalProfile = async () => {
    setLoading((prev) => ({ ...prev, profile: true }));
    try {
      const res = await axios.get(`http://localhost:5000/users/${userId}`);
      if (!res.data.name) throw new Error('Incomplete hospital profile data');
      const profile = {
        name: res.data.name,
        about: res.data.about || 'No description available.',
        address: res.data.address || 'Not specified',
        lat: res.data.lat || 0,
        lng: res.data.lng || 0,
        phone: res.data.phone || 'Not specified',
        email: res.data.email || 'Not specified',
      };
      setHospitalProfile(profile);
      setEditHospitalProfile(profile);
    } catch (err) {
      setMessage('Failed to fetch hospital profile');
      console.error('Error fetching hospital profile:', err);
    } finally {
      setLoading((prev) => ({ ...prev, profile: false }));
    }
  };
  const fetchDoctors = async () => {
    setLoading((prev) => ({ ...prev, doctors: true }));
    try {
      const response = await axios.get(`http://localhost:5000/doctors?hospital_user_id=${userId}`);
      setDoctors(response.data);
    } catch (err) {
      setMessage('Error fetching doctors');
      console.error('Error fetching doctors:', err);
    } finally {
      setLoading((prev) => ({ ...prev, doctors: false }));
    }
  };

  const fetchAppointments = async () => {
    setLoading((prev) => ({ ...prev, appointments: true }));
    try {
      const res = await axios.get(`http://localhost:5000/appointments?hospital_user_id=${userId}`);
      setAppointments(res.data);
    } catch (err) {
      setMessage('Failed to fetch appointments');
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading((prev) => ({ ...prev, appointments: false }));
    }
  };

  const fetchPatients = async () => {
    setLoading((prev) => ({ ...prev, patients: true }));
    try {
      const res = await axios.get('http://localhost:5000/users?role=patient');
      setPatients(res.data);
    } catch (err) {
      setMessage('Failed to fetch patients');
      console.error('Error fetching patients:', err);
    } finally {
      setLoading((prev) => ({ ...prev, patients: false }));
    }
  };

  const handleEditProfile = async () => {
    try {
      await axios.put(`http://localhost:5000/users/${userId}`, editHospitalProfile);
      setHospitalProfile(editHospitalProfile);
      setMessage('Hospital profile updated successfully');
      setIsEditModalOpen(false);
    } catch (err) {
      setMessage('Failed to update hospital profile');
      console.error('Error updating hospital profile:', err);
    }
  };

  const downloadBillPDF = (appt) => {
    const doc = new jsPDF();
    const patient = patients.find(p => p.user_id === appt.patient_user_id) || { name: 'Unknown Patient' };
    const doctor = doctors.find(d => d.user_id === appt.doctor_user_id) || { name: 'Unknown Doctor' };
    doc.setFontSize(16);
    doc.text('Appointment Bill', 20, 20);
    doc.setFontSize(12);
    doc.text(`Appointment ID: ${appt._id}`, 20, 30);
    doc.text(`Token Number: ${appt.token_number || 'Not Assigned'}`, 20, 40);
    doc.text(`Patient: ${patient.name}`, 20, 50);
    doc.text(`Doctor: ${doctor.name}`, 20, 60);
    doc.text(`Hospital: ${hospitalProfile.name || 'Unknown Hospital'}`, 20, 70);
    doc.text(`Date: ${new Date(appt.date).toLocaleDateString()}`, 20, 80);
    doc.text(`Time: ${appt.time}`, 20, 90);
    doc.text(`Status: ${appt.status}`, 20, 100);
    doc.text(`Notes: ${appt.notes || 'None'}`, 20, 110);
    doc.text(`Amount: $${appt.cost || 100}.00`, 20, 120);
    doc.save(`bill_${appt._id}.pdf`);
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      Scheduled: 'bg-blue-100 text-blue-800',
      'In Progress': 'bg-blue-100 text-blue-800',
      Completed: 'bg-green-100 text-green-800',
      Cancelled: 'bg-gray-100 text-gray-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  const toggleSidebar = () => setIsOpen(!isOpen);

  const handleLogout = () => {
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    navigate('/');
  };

  const handleSectionChange = (section) => {
    setActiveSection(section);
    if (windowWidth <= 768) setIsOpen(false);
  };

  const menuItems = {
    hospital: [
      { name: 'Dashboard', section: 'dashboard', icon: <MdDashboard size={20} /> },
      { name: 'Doctors', section: 'doctors', icon: <MdPeople size={20} /> },
      { name: 'Appointments', section: 'appointments', icon: <MdEvent size={20} /> },
    ],
  };

  const isLoading = Object.values(loading).some((status) => status);

  return (
    <div className="flex min-h-screen bg-gray-100">
      <div>
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
              <p className="font-medium">{hospitalProfile.name || 'Unknown Hospital'}</p>
              <p className="text-gray-300">ID: {userInfo.user_id}</p>
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="mt-2 flex items-center text-blue-400 hover:text-blue-300"
              >
                <MdEdit size={16} className="mr-1" /> Edit Profile
              </button>
            </div>
            <button className="md:hidden text-white absolute top-4 right-4" onClick={toggleSidebar}>✕</button>
          </div>

          <ul className="mt-4">
            {menuItems.hospital.map((item) => (
              <li key={item.section}>
                <button
                  className={`flex items-center w-full px-4 py-3 text-left transition-colors ${activeSection === item.section ? 'bg-gray-700' : 'hover:bg-gray-700'
                    }`}
                  onClick={() => handleSectionChange(item.section)}
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
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 sm:p-6 ml-0 md:ml-64">
        {message && (
          <div
            className={`mb-4 p-4 rounded flex justify-between items-center ${message.includes('successfully')
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
              }`}
          >
            <span>{message}</span>
            <button onClick={() => setMessage('')} className="text-lg font-bold hover:text-gray-600">
              ×
            </button>
          </div>
        )}

        {isLoading && (
          <div className="mb-4 p-4 bg-blue-100 text-blue-800 rounded flex items-center">
            <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Loading data...
          </div>
        )}

        {/* Edit Profile Modal */}
        {isEditModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-2xl h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-bold mb-6 text-gray-800">Edit Hospital Profile</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hospital Name</label>
                  <input
                    type="text"
                    value={editHospitalProfile.name}
                    onChange={(e) => setEditHospitalProfile({ ...editHospitalProfile, name: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter hospital name"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">About</label>
                  <textarea
                    value={editHospitalProfile.about}
                    onChange={(e) => setEditHospitalProfile({ ...editHospitalProfile, about: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows="4"
                    placeholder="Enter hospital description"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={editHospitalProfile.address}
                    onChange={(e) => setEditHospitalProfile({ ...editHospitalProfile, address: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={editHospitalProfile.lat}
                    onChange={(e) => setEditHospitalProfile({ ...editHospitalProfile, lat: parseFloat(e.target.value) || 0 })}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter latitude"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={editHospitalProfile.lng}
                    onChange={(e) => setEditHospitalProfile({ ...editHospitalProfile, lng: parseFloat(e.target.value) || 0 })}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter longitude"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={editHospitalProfile.phone}
                    onChange={(e) => setEditHospitalProfile({ ...editHospitalProfile, phone: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter phone number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editHospitalProfile.email}
                    onChange={(e) => setEditHospitalProfile({ ...editHospitalProfile, email: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter email address"
                  />
                </div>

              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditProfile}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Section */}
        {activeSection === 'dashboard' && (
  <div>
    <h2 className="text-xl sm:text-2xl font-bold mb-6 text-gray-800">Hospital Dashboard</h2>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Hospital Info Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-700">Hospital Information</h3>
        <p className="text-gray-600"><strong>Name:</strong> {hospitalProfile.name || 'Not specified'}</p>
        <p className="text-gray-600 mt-2"><strong>About:</strong> {hospitalProfile.about || 'Not specified'}</p>
        <p className="text-gray-600 mt-2"><strong>Phone:</strong> {hospitalProfile.phone || 'Not specified'}</p>
        <p className="text-gray-600 mt-2"><strong>Email:</strong> {hospitalProfile.email || 'Not specified'}</p>
      </div>

      {/* Location Card with Map */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-700">Location</h3>
        {hospitalProfile.address ? (
          <MapContainer
            center={mapCenter}
            zoom={13}
            style={{ height: '256px', width: '100%', borderRadius: '8px' }}
            className="rounded"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {markerPosition && (
              <Marker position={markerPosition}>
                <Popup>{hospitalProfile.name || 'Hospital'}<br />{hospitalProfile.address}</Popup>
              </Marker>
            )}
          </MapContainer>
        ) : (
          <p className="text-gray-500">Map not available. Please set an address.</p>
        )}
      </div>
      

      {/* Vision Card */}
      {/* <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-700">Vision</h3>
        <p className="text-gray-600">{hospitalProfile.vision || 'Not specified'}</p>
      </div> */}

      {/* Mission Card */}
      {/* <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-700">Mission</h3>
        <p className="text-gray-600">{hospitalProfile.mission || 'Not specified'}</p>
      </div> */}

      {/* Achievements Card */}
      {/* <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-700">Achievements</h3>
        <p className="text-gray-600">{hospitalProfile.achievements || 'Not specified'}</p>
      </div> */}

      {/* Facilities Card */}
      {/* <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-700">Facilities</h3>
        <p className="text-gray-600">{hospitalProfile.facilities || 'Not specified'}</p>
      </div>  */}

    </div>
  </div>
)}
        {/* Doctors Section */}
        {activeSection === 'doctors' && (
          <div className="mb-8">
            <h3 className="text-lg sm:text-xl font-semibold mb-4 text-gray-700">Doctors</h3>
            {doctors.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {doctors.map((doctor) => (
                  <div
                    key={doctor.user_id}
                    className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => setSelectedDoctor(doctor)}
                  >
                    <img
                      src={doctor.image || 'https://via.placeholder.com/150'}
                      alt={doctor.name}
                      className="w-24 h-24 rounded-full mx-auto mb-3 object-cover"
                    />
                    <h4 className="text-lg font-semibold text-gray-800 text-center">{doctor.name}</h4>
                    <p className="text-sm text-gray-600 text-center">{doctor.specialization || 'General'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm sm:text-base">No doctors assigned</p>
            )}
          </div>
        )}

        {/* Appointments Section */}
        {activeSection === 'appointments' && (
          <div>
            <h3 className="text-lg sm:text-xl font-semibold mb-4 text-gray-700">Appointments</h3>
            {appointments.length === 0 ? (
              <p className="text-gray-500 text-sm sm:text-base">No appointments scheduled.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white rounded-lg shadow">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doctor</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Token</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {appointments.map((appt) => (
                      <tr key={appt._id} className="hover:bg-gray-50">
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-900 truncate max-w-[150px]">
                          {patients.find(p => p.user_id === appt.patient_user_id)?.name || appt.patient_user_id}
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-900 truncate max-w-[150px]">
                          {doctors.find(d => d.user_id === appt.doctor_user_id)?.name || appt.doctor_user_id}
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-900">{new Date(appt.date).toLocaleDateString()}</td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-900">{appt.time}</td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-900">{appt.token_number || 'Not Assigned'}</td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-900">{getStatusBadge(appt.status)}</td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-900 truncate max-w-[200px]">{appt.notes || '-'}</td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-900">
                          <button
                            onClick={() => downloadBillPDF(appt)}
                            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={loading.profile || loading.patients || loading.doctors}
                          >
                            Download Bill
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}