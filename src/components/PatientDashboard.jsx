import { useEffect, useState } from 'react';
import axios from 'axios';
import Sidebar from './Sidebar';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';


export default function PatientDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [profile, setProfile] = useState({});
  const [hospital, setHospital] = useState(null);
  const [hospitalId, setHospitalId] = useState(null);
  const [expenses, setExpenses] = useState(0);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [appointmentForm, setAppointmentForm] = useState({
    doctor_user_id: '',
    date: '',
    time: '',
    notes: '',
    availableTimes: [],
  });
  const [message, setMessage] = useState('');
  const [activeSection, setActiveSection] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: '',
    age: '',
    gender: '',
    password: '',
    confirmPassword: '',
  });

  const [age, setAge] = useState('');
  const [glucose, setGlucose] = useState('');
  const [bmi, setBmi] = useState('');
  const [prediction, setPrediction] = useState(null);

  const [showAvailableOnly, setShowAvailableOnly] = useState(true); // Added back
  const navigate = useNavigate();

  const user_id = localStorage.getItem('userId');

  useEffect(() => {
    if (!user_id || !user_id.startsWith('PT_')) {
      setMessage('Invalid patient user ID. Please log in again.');
      console.error('PatientDashboard: Invalid or missing user_id in localStorage');
      navigate('/login');
      return;
    }
    fetchProfile();
  }, [user_id, navigate]);

  useEffect(() => {
    if (hospitalId) {
      Promise.all([fetchDoctors(), fetchAppointments(), fetchPrescriptions(), fetchMedicalRecords(), fetchHospitalAndExpenses()]);
    }
  }, [hospitalId]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const featureVector = [
      parseInt(age),
      parseFloat(glucose),
      70,  //Example placeholder: BloodPressure
      20,  //Example placeholder: SkinThickness
      80,  //Example placeholder: Insulin
      parseFloat(bmi),
      0.5, // Example placeholder: DiabetesPedigreeFunction
      32   // Example placeholder: Age (duplicate if needed)
    ];

    try {
      const res = await axios.post("http://localhost:5000/predict_risk", {
        features: featureVector
      });

      setPrediction(res.data);
    } catch (error) {
      console.error("Prediction failed", error);
    }
  };


  const fetchProfile = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/users/${user_id}`);
      const user = res.data;
      if (user) {
        setProfile(user);
        const hospitalId = user.hospital_user_id;
        if (!hospitalId || !hospitalId.startsWith('HP_')) {
          setMessage('Invalid or missing hospital association for this patient.');
          console.error('Invalid hospitalId:', hospitalId);
          return;
        }
        setHospitalId(hospitalId);
        setEditForm({
          name: user.name || '',
          phone: user.phone || '',
          email: user.email || '',
          age: user.age || '',
          gender: user.gender || '',
        });
      }
    } catch (err) {
      setMessage('Failed to fetch profile');
      console.error('Error fetching profile:', err);
    }
  };

  const fetchDoctors = async () => {
    try {
      if (!hospitalId) {
        setMessage('Hospital ID not available.');
        return;
      }
      const res = await axios.get(`http://localhost:5000/doctors`, {
        params: { hospital_user_id: hospitalId, include_availability: true },
      });
      const doctorsData = res.data.doctors || res.data;
      setDoctors(doctorsData);
      if (doctorsData.length === 0) {
        setMessage('No doctors found for your hospital.');
      }
    } catch (err) {
      setMessage('Failed to fetch doctors');
      console.error('Error fetching doctors:', err);
    }
  };

  const isAppointmentUpcoming = (appointment) => {
    const now = new Date('2025-06-30T14:49:00Z'); // 08:19 PM IST (UTC+5:30)
    const appointmentTime = new Date(`${appointment.date}T${appointment.time}:00Z`);
    return ['Scheduled', 'Not Completed'].includes(appointment.status) && appointmentTime > now;
  };

  const fetchAppointments = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/appointments?patient_user_id=${user_id}`);
      setAppointments(res.data);
    } catch (err) {
      setMessage('Failed to fetch appointments');
      console.error('Error fetching appointments:', err);
    }
  };

  const fetchPrescriptions = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/prescriptions?patient_user_id=${user_id}`);
      setPrescriptions(res.data);
    } catch (err) {
      setMessage('Failed to fetch prescriptions');
      console.error('Error fetching prescriptions:', err);
    }
  };

  const fetchMedicalRecords = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/medical_records?patient_user_id=${user_id}`);
      setMedicalRecords(res.data);
    } catch (err) {
      setMessage('Failed to fetch medical records');
      console.error('Error fetching medical records:', err);
    }
  };

  const fetchHospitalAndExpenses = async () => {
    try {
      const userRes = await axios.get(`http://localhost:5000/users/${user_id}`);
      const hospitalId = userRes.data.hospital_user_id;
      if (hospitalId) {
        const hospitalRes = await axios.get(`http://localhost:5000/users/${hospitalId}`);
        setHospital(hospitalRes.data);
        const apptsRes = await axios.get(`http://localhost:5000/appointments?patient_user_id=${user_id}&hospital_user_id=${hospitalId}`);
        const totalExpenses = apptsRes.data.reduce((sum, appt) => sum + (appt.cost || 100), 0);
        setExpenses(totalExpenses);
      }
    } catch (err) {
      setMessage('Failed to fetch hospital or expenses');
      console.error('Error fetching hospital or expenses:', err);
    }
  };




  const handleEditProfile = async (e) => {
    e.preventDefault();
    try {
      if (editForm.password && editForm.password !== editForm.confirmPassword) {
        setMessage('Passwords do not match');
        return;
      }
      const updatedData = {
        user_id,
        name: editForm.name,
        phone: editForm.phone,
        email: editForm.email,
        age: editForm.age,
        gender: editForm.gender,
      };
      if (editForm.password) updatedData.password = editForm.password;
      const res = await axios.put(`http://localhost:5000/users/${user_id}`, updatedData);
      setMessage(res.data.message);
      if (res.data.user) {
        setProfile(res.data.user);
        setIsEditing(false);
        fetchProfile();
      }
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to update profile');
      console.error('Error updating profile:', err);
    }
  };

  const fetchAvailableTimes = async () => {
    try {
      if (!selectedDoctor || !appointmentForm.date) {
        setMessage('Please select a doctor and date.');
        return;
      }
      const res = await axios.get(`http://localhost:5000/availability`, {
        params: { doctor_user_id: selectedDoctor.user_id, date: appointmentForm.date },
      });
      const times = res.data.map(slot => slot.time).sort();
      setAppointmentForm(prev => ({
        ...prev,
        availableTimes: times,
        time: times[0] || '',
      }));
      setMessage(times.length === 0 ? 'No available time slots for this date.' : '');
    } catch (err) {
      setMessage('Failed to fetch time slots.');
      console.error('Error fetching available times:', err);
    }
  };

  const handleAppointmentSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!appointmentForm.time) {
        setMessage('Please select a time slot.');
        return;
      }
      const res = await axios.post('http://localhost:5000/appointments', {
        doctor_user_id: appointmentForm.doctor_user_id,
        patient_user_id: user_id,
        date: appointmentForm.date,
        time: appointmentForm.time,
        notes: appointmentForm.notes,
        status: 'Scheduled',
        payment_status: 'Pending',
      });

      setMessage(`Appointment booked successfully for ${new Date(appointmentForm.date).toDateString()}!`);
      setAppointmentForm({ doctor_user_id: '', date: '', time: '', notes: '', availableTimes: [] });
      await Promise.all([fetchAppointments(), fetchDoctors(), fetchHospitalAndExpenses()]);
      navigate('/appointment-confirmation', { state: { appointment: res.data } });
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to book appointment');
      console.error('Error booking appointment:', err);
    }
  };

  const cancelAppointment = async (id) => {
    if (!window.confirm('Cancel this appointment?')) return;
    try {
      const res = await axios.delete(`http://localhost:5000/appointments/${id}`);
      setMessage(res.data.message);
      await Promise.all([fetchAppointments(), fetchDoctors(), fetchHospitalAndExpenses()]);
      if (selectedDoctor) fetchAvailableTimes();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to cancel appointment');
      console.error('Error cancelling appointment:', err);
    }
  };

  const downloadPrescription = async (id) => {
    try {
      const response = await axios.get(`http://localhost:5000/download/prescription/${id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `prescription_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setMessage('Failed to download prescription');
      console.error('Error downloading prescription:', err);
    }
  };

  const downloadMedicalRecord = async (id) => {
    try {
      const response = await axios.get(`http://localhost:5000/download/medical_record/${id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `medical_record_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setMessage('Failed to download medical record');
      console.error('Error downloading medical record:', err);
    }
  };

  const downloadBillPDF = (appt) => {
    const doc = new jsPDF();
    const patient = profile;
    const doctor = doctors.find(d => d.user_id === appt.doctor_user_id);
    doc.setFontSize(16);
    doc.text('Appointment Bill', 20, 20);
    doc.setFontSize(12);
    doc.text(`Appointment ID: ${appt._id}`, 20, 30);
    doc.text(`Token Number: ${appt.token_seq || 'N/A'}`, 20, 40);
    doc.text(`Patient: ${patient?.name || appt.patient_user_id}`, 20, 50);
    doc.text(`Doctor: ${doctor?.name || appt.doctor_user_id}`, 20, 60);
    doc.text(`Hospital: ${hospital?.name || 'N/A'}`, 20, 70);
    doc.text(`Date: ${new Date(appt.date).toLocaleDateString()}`, 20, 80);
    doc.text(`Time: ${appt.time}`, 20, 90);
    doc.text(`Status: ${appt.status}`, 20, 100);
    doc.text(`Notes: ${appt.notes || 'None'}`, 20, 110);
    doc.text(`Amount: ₹${(appt.cost || 100).toFixed(2)}`, 20, 120);
    doc.save(`bill_${appt._id}.pdf`);
  };

  const confirmAppointment = (appointment) => {
    navigate('/appointment-confirmation', { state: { appointment } });
  };

  const filteredDoctors = doctors.filter(doctor =>
    (showAvailableOnly ? doctor.isActive : true) &&
    (doctor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doctor.specialization || '').toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handlePrevMonth = () => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));

  const renderCalendar = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const availableDates = selectedDoctor?.availability
      ? [...new Set(selectedDoctor.availability.map(slot => slot.date))]
      : [];

    let days = [];
    for (let i = 0; i < firstDay; i++) days.push(<div key={`blank-${i}`} className="h-10"></div>);
    for (let d = 1; d <= daysInMonth; d++) {
      const dayStr = d < 10 ? `0${d}` : `${d}`;
      const fullDate = `${year}-${month + 1 < 10 ? `0${month + 1}` : month + 1}-${dayStr}`;
      const isAvailable = availableDates.includes(fullDate);
      const isSelected = appointmentForm.date === fullDate;
      days.push(
        <button
          key={`day-${d}`}
          onClick={() => {
            if (isAvailable) {
              setAppointmentForm({
                ...appointmentForm,
                date: fullDate,
                time: '',
                availableTimes: [],
                doctor_user_id: selectedDoctor.user_id,
              });
              fetchAvailableTimes();
            }
          }}
          disabled={!isAvailable}
          className={`h-10 w-10 flex items-center justify-center rounded-full text-sm ${isSelected ? 'bg-blue-500 text-white' : isAvailable ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'text-gray-400 cursor-not-allowed'}`}
        >
          {d}
        </button>
      );
    }
    return days;
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      Scheduled: 'bg-blue-100 text-blue-800',
      'Not Completed': 'bg-yellow-100 text-yellow-800',
      Completed: 'bg-green-100 text-green-800',
      Cancelled: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  const nextAppointment = appointments
    .filter(a => ['Scheduled', 'In Progress'].includes(a.status))
    .sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time))[0];

  return (
    <div className="flex min-h-screen bg-gray-100">

      <Sidebar role="patient" onSectionChange={setActiveSection} />
      <div className="flex-1 p-4 sm:p-6 md:ml-64">
        <div className="flex flex-col md:flex-row md:items-start md:space-x-6 mb-6">
          {nextAppointment && (
            <div className="mb-4 md:mb-0 p-4 bg-blue-50 border-l-4 border-blue-400 text-blue-800 rounded shadow max-w-xl w-full md:w-1/2">
              <div className="font-bold text-lg mb-1">Your Next Appointment</div>
              <div>Date: {new Date(nextAppointment.date).toLocaleDateString()}</div>
              <div>Time: {nextAppointment.time}</div>
              <div>Token Number: {nextAppointment.token_seq || 'N/A'}</div>
              <div>Doctor: {doctors.find(d => d.user_id === nextAppointment.doctor_user_id)?.name || nextAppointment.doctor_user_id}</div>
            </div>
          )}
          <div className="bg-white rounded-lg shadow p-4 w-full md:w-1/3">
            <h3 className="text-sm font-semibold text-gray-700">Hospital Expenses</h3>
            <p className="text-lg font-bold text-green-600">₹{expenses.toFixed(2)}</p>
            <p className="text-xs text-gray-500">Total spent at {hospital?.name || 'your hospital'}</p>
          </div>
        </div>

        {message && (
          <div className={`mb-4 p-4 rounded flex justify-between items-center ${message.includes('successfully') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            <span>{message}</span>
            <button onClick={() => setMessage('')} className="text-lg font-bold hover:text-gray-600">×</button>
          </div>
        )}

        {activeSection === 'dashboard' && (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-800">Patient Dashboard</h2>
            <p className="text-sm sm:text-base text-gray-600 pt-10">
              Welcome to your dashboard. Use the sidebar to manage appointments, prescriptions, medical records, and profile.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="bg-blue-50 rounded-lg p-4 shadow">
                <h3 className="text-base sm:text-lg font-semibold text-gray-700">Upcoming Appointments</h3>
                <p className="text-2xl sm:text-3xl font-bold text-blue-600">
                  {appointments.filter(a => ['Scheduled', 'Not Completed'].includes(a.status)).length}
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 shadow">
                <h3 className="text-base sm:text-lg font-semibold text-gray-700">Active Prescriptions</h3>
                <p className="text-2xl sm:text-3xl font-bold text-green-600">{prescriptions.length}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 shadow">
                <h3 className="text-base sm:text-lg font-semibold text-gray-700">Medical Records</h3>
                <p className="text-2xl sm:text-3xl font-bold text-purple-600">{medicalRecords.length}</p>
              </div>
            </div>
            <div className="mt-6">
              <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
                <input
                  type="text"
                  placeholder="Search doctors by name or specialization..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-1/2 px-4 py-2 mb-2 sm:mb-0 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-gray-700">
                    {showAvailableOnly ? 'Available Only' : 'All Doctors'}
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showAvailableOnly}
                      onChange={() => setShowAvailableOnly(!showAvailableOnly)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-300 peer-checked:bg-blue-600 transition-colors">
                      <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${showAvailableOnly ? 'translate-x-5' : 'translate-x-0'}`}></div>
                    </div>
                  </label>
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-4 text-gray-700">
                {showAvailableOnly ? 'Available Doctors' : 'All Doctors'}
              </h3>
              {filteredDoctors.length === 0 ? (
                <p className="text-gray-500">{showAvailableOnly ? 'No available doctors found.' : 'No doctors found.'}</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {filteredDoctors.map((doctor) => (
                    <div
                      key={doctor.user_id}
                      className="bg-gray-50 p-4 rounded-lg shadow-sm hover:shadow-md cursor-pointer transition-shadow"
                      onClick={() => setSelectedDoctor(doctor)}
                    >
                      <div className="flex items-center space-x-4">
                        <img
                          className="h-12 w-12 rounded-full object-cover"
                          src={doctor.image || 'https://via.placeholder.com/150'}
                          alt={doctor.name}
                        />
                        <div>
                          <h4 className="text-base sm:text-lg font-medium text-gray-800">{doctor.name}</h4>
                          <p className="text-sm text-gray-500">{doctor.specialization || 'General Practitioner'}</p>
                        </div>
                      </div>
                      <div className="mt-2 flex justify-between items-center">
                        <span className={`text-xs px-2 py-1 rounded-full ${doctor.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {doctor.isActive ? 'Available' : 'Unavailable'}
                        </span>
                        <button className="text-blue-600 text-sm hover:text-blue-800">View</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* <div>
              <h2>🩺 Patient Risk Predictor</h2>
              <form onSubmit={handleSubmit}>
                <input type="number" placeholder="Age" value={age} onChange={e => setAge(e.target.value)} required />
                <input type="number" placeholder="Glucose Level" value={glucose} onChange={e => setGlucose(e.target.value)} required />
                <input type="number" placeholder="BMI" value={bmi} onChange={e => setBmi(e.target.value)} required />
                <button type="submit">Predict Risk</button>
              </form>

              {prediction && (
                <div>
                  <h3>🧬 Prediction: {prediction.prediction === 1 ? 'High Risk' : 'Low Risk'}</h3>
                  <p>Confidence: {(prediction.confidence * 100).toFixed(2)}%</p>
                </div>
              )}


              <div className="dashboard">
                <nav className="sidebar">
                  <ul>
                    <li
                      className={activeSection === 'risk' ? 'active' : ''}
                      onClick={() => setActiveSection('risk')}
                    >
                      🧬 Risk Prediction
                    </li>
                    <li
                      className={activeSection === 'profile' ? 'active' : ''}
                      onClick={() => setActiveSection('profile')}
                    >
                      👤 Patient Profile
                    </li>
                  </ul>
                </nav>

        
              </div>
            </div> */}


          </div>
        )}

        {activeSection === 'profile' && (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800">My Profile</h1>
              <button
                onClick={() => setIsEditing(!isEditing)}
                className={`px-4 py-2 rounded-lg text-sm sm:text-base ${isEditing ? 'bg-gray-500 hover:bg-gray-600' : 'bg-blue-600 hover:bg-blue-700'} text-white transition-colors`}
              >
                {isEditing ? 'Cancel Editing' : 'Edit Profile'}
              </button>
            </div>
            {isEditing ? (
              <form onSubmit={handleEditProfile} className="bg-gray-50 p-4 sm:p-6 rounded-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                    <input
                      type="number"
                      value={editForm.age}
                      onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      max="120"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                    <select
                      value={editForm.gender}
                      onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                      <option value="Prefer not to say">Prefer not to say</option>
                    </select>
                  </div>
                </div>
                <div className="mb-6">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3">Change Password</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                      <input
                        type="password"
                        value={editForm.password}
                        onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Leave blank to keep current"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                      <input
                        type="password"
                        value={editForm.confirmPassword}
                        onChange={(e) => setEditForm({ ...editForm, confirmPassword: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Leave blank to keep current"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row justify-end gap-4">
                  <button
                    type="submit"
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            ) : (
              <div className="bg-gray-50 p-4 sm:p-6 rounded-lg">
                <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
                  <div className="flex-shrink-0">
                    <div className="h-32 w-32 sm:h-48 sm:w-48 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                      {profile.image ? (
                        <img src={profile.image} alt="Profile" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-2xl sm:text-4xl text-gray-500">{profile.name ? profile.name.charAt(0).toUpperCase() : 'P'}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex-grow">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">{profile.name || 'No Name Provided'}</h2>
                    <p className="text-sm sm:text-base text-gray-600 mb-6">Patient</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                      <div>
                        <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3">Contact Information</h3>
                        <div className="space-y-2 text-sm sm:text-sm">
                          <p><span className="font-medium text-gray-700">Phone:</span> {profile.phone || 'Not provided'}</p>
                          <p><span className="font-medium text-gray-700">Email:</span> {profile.email || 'Not provided'}</p>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3">Personal Details</h3>
                        <div className="space-y-2 text-sm sm:text-sm">
                          <p><span className="font-medium text-gray-700">Age:</span> {profile.age || 'Not provided'}</p>
                          <p><span className="font-medium text-gray-700">Gender:</span> {profile.gender || 'Not provided'}</p>
                          <p><span className="font-medium text-gray-700">Hospital:</span> {hospital?.name || 'Not provided'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === 'appointments' && (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-6 text-gray-800">Appointments</h2>
            {!selectedDoctor ? (
              <>
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
                  <input
                    type="text"
                    placeholder="Search doctors by name or specialization..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-1/2 px-4 py-2 mb-2 sm:mb-0 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-700">
                      {showAvailableOnly ? 'Available Only' : 'All Doctors'}
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showAvailableOnly}
                        onChange={() => setShowAvailableOnly(!showAvailableOnly)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-300 peer-checked:bg-blue-600 transition-colors">
                        <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${showAvailableOnly ? 'translate-x-5' : 'translate-x-0'}`}></div>
                      </div>
                    </label>
                  </div>
                </div>
                <h3 className="text-lg sm:text-xl font-semibold mb-4 text-gray-700">
                  {showAvailableOnly ? 'Available Doctors' : 'All Doctors'}
                </h3>
                {filteredDoctors.length === 0 ? (
                  <p className="text-gray-500">{showAvailableOnly ? 'No available doctors found.' : 'No doctors found.'}</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {filteredDoctors.map((doctor) => (
                      <div
                        key={doctor.user_id}
                        className="bg-gray-50 p-4 rounded-lg shadow-sm hover:shadow-md cursor-pointer transition-shadow"
                        onClick={() => setSelectedDoctor(doctor)}
                      >
                        <div className="flex items-center space-x-4">
                          <img
                            className="h-12 w-12 rounded-full object-cover"
                            src={doctor.image || 'https://via.placeholder.com/150'}
                            alt={doctor.name}
                          />
                          <div>
                            <h4 className="text-base sm:text-lg font-medium text-gray-800">{doctor.name}</h4>
                            <p className="text-sm text-gray-500">{doctor.specialization || 'General Practitioner'}</p>
                          </div>
                        </div>
                        <div className="mt-2 flex justify-between items-center">
                          <span className={`text-xs px-2 py-1 rounded-full ${doctor.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {doctor.isActive ? 'Available' : 'Unavailable'}
                          </span>
                          <button className="text-blue-600 text-sm hover:text-blue-800">View</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div>
                <button
                  onClick={() => setSelectedDoctor(null)}
                  className="flex items-center text-blue-600 mb-4 text-sm sm:text-base hover:underline"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to Doctors
                </button>
                <div className="bg-gray-50 p-4 sm:p-6 rounded-lg shadow-sm mb-6">
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                    <img
                      className="h-16 w-16 sm:h-20 sm:w-20 rounded-full object-cover"
                      src={selectedDoctor.image || 'https://via.placeholder.com/150'}
                      alt={selectedDoctor.name}
                    />
                    <div>
                      <h3 className="text-lg sm:text-xl font-semibold text-gray-800">{selectedDoctor.name}</h3>
                      <p className="text-sm text-gray-500">{selectedDoctor.specialization || 'General Practitioner'}</p>
                      <p className="text-sm mt-2 text-gray-600">{selectedDoctor.about || 'No information provided.'}</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="bg-gray-50 p-4 sm:p-6 rounded-lg shadow-sm">
                    <h3 className="text-base sm:text-lg font-semibold mb-2 text-gray-700">Select Date</h3>
                    {selectedDoctor.availability?.length > 0 ? (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <button onClick={handlePrevMonth} className="px-2 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300">Prev</button>
                          <span className="text-sm sm:text-base font-medium">{calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                          <button onClick={handleNextMonth} className="px-2 py-1 bg-gray-200 rounded text-sm hover:bg-gray-300">Next</button>
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-center">
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="text-xs font-medium text-gray-500">{day}</div>
                          ))}
                          {renderCalendar()}
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">No available dates.</p>
                    )}
                  </div>
                  <div className="bg-gray-50 p-4 sm:p-6 rounded-lg shadow-sm">
                    <h3 className="text-base sm:text-lg font-semibold mb-2 text-gray-700">Available Times</h3>
                    {appointmentForm.date ? (
                      <>
                        <p className="text-sm mb-2">{new Date(appointmentForm.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
                        {appointmentForm.availableTimes.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {appointmentForm.availableTimes.map(time => (
                              <button
                                key={time}
                                onClick={() => setAppointmentForm({ ...appointmentForm, time })}
                                className={`p-2 rounded text-sm ${appointmentForm.time === time ? 'bg-blue-500 text-white' : 'bg-green-100 text-green-800 hover:bg-green-200'}`}
                              >
                                {time}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm">No time slots available.</p>
                        )}
                        {appointmentForm.time && (
                          <>
                            <textarea
                              value={appointmentForm.notes}
                              onChange={(e) => setAppointmentForm({ ...appointmentForm, notes: e.target.value })}
                              className="w-full px-4 py-2 mt-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              rows="3"
                              placeholder="Notes (optional)"
                            />
                            <button
                              onClick={handleAppointmentSubmit}
                              className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                              disabled={!appointmentForm.time}
                            >
                              Confirm Appointment
                            </button>
                          </>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-500 text-sm">Select a date first.</p>
                    )}
                  </div>
                </div>
                <div className="mt-6">
                  <h3 className="text-base sm:text-lg font-semibold mb-2 text-gray-700">Upcoming Appointments with {selectedDoctor.name}</h3>
                  {appointments.filter(a => a.doctor_user_id === selectedDoctor.user_id).filter(isAppointmentUpcoming).length === 0 ? (
                    <p className="text-gray-500 text-sm">No upcoming appointments booked.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-white rounded-lg">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Token</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {appointments
                            .filter(a => a.doctor_user_id === selectedDoctor.user_id)
                            .filter(isAppointmentUpcoming)
                            .map(appt => (
                              <tr key={appt._id} className="hover:bg-gray-50">
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(appt.date).toLocaleDateString()}</td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">{appt.time}</td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">{appt.token_seq || 'N/A'}</td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap">{getStatusBadge(appt.status)}</td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2 py-1 rounded-full text-xs ${appt.payment_status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                    {appt.payment_status}
                                  </span>
                                </td>
                                <td className="px-4 sm:px-6 py-4 text-sm text-gray-900 max-w-xs truncate">{appt.notes || '-'}</td>
                                <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  {(appt.status === 'Scheduled' || appt.status === 'Not Completed') && (
                                    <button onClick={() => cancelAppointment(appt._id)} className="text-red-600 hover:text-red-800 mr-2">Cancel</button>
                                  )}
                                  <button
                                    onClick={() => confirmAppointment(appt)}
                                    className="text-blue-600 hover:text-blue-800 mr-2"
                                  >
                                    View
                                  </button>
                                  <button
                                    onClick={() => downloadBillPDF(appt)}
                                    className="text-green-600 hover:text-green-900"
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
              </div>
            )}
          </div>
        )}





        {activeSection === 'prescriptions' && (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-6 text-gray-800">Prescriptions</h2>
            {prescriptions.length === 0 ? (
              <p className="text-gray-500 text-sm sm:text-base">No prescriptions available.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white rounded-lg">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medication</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dosage</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Instructions</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {prescriptions.map(p => (
                      <tr key={p._id} className="hover:bg-gray-50">
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.medication}</td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.dosage}</td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-900 max-w-sm truncate">{p.instructions || '-'}</td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(p.created_at).toLocaleDateString()}</td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => downloadPrescription(p._id)}
                            className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
                          >
                            Download
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

        {activeSection === 'records' && (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-6 text-gray-800">Medical Records</h2>
            {medicalRecords.length === 0 ? (
              <p className="text-gray-500 text-sm sm:text-base">No medical records available.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white rounded-lg">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Doctor</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Diagnosis</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Treatment</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {medicalRecords.map(record => (
                      <tr key={record._id} className="hover:bg-gray-50">
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(record.created_at).toLocaleDateString()}</td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {doctors.find(d => d.user_id === record.doctor_user_id)?.name || record.doctor_user_id}
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-900 max-w-sm truncate">{record.diagnosis || 'No diagnosis recorded'}</td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-900 max-w-sm truncate">{record.treatment || 'No treatment recorded'}</td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => downloadMedicalRecord(record._id)}
                            className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm"
                          >
                            Download
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

        {activeSection === 'risk' && (
          <>
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6">
              <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 w-full max-w-md">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6 flex items-center">
                  <span className="mr-2">🩺</span> Diabetes Risk Predictor
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                    <input
                      type="text"
                      placeholder="Enter age"
                      value={age}
                      onChange={e => setAge(e.target.value)}
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Glucose Level</label>
                    <input
                      type="text"
                      placeholder="Enter glucose level"
                      value={glucose}
                      onChange={e => setGlucose(e.target.value)}
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">BMI</label>
                    <input
                      type="text"
                      placeholder="Enter BMI"
                      value={bmi}
                      onChange={e => setBmi(e.target.value)}
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors shadow"
                  >
                    Predict Risk
                  </button>
                </form>

                {prediction && (
                  <div className="mt-6 p-4 bg-indigo-50 rounded-lg shadow-inner">
                    <h3 className="text-lg font-semibold text-indigo-800 flex items-center">
                      Prediction: {prediction.prediction === 1 ? <span className="text-red-600 ml-2">🔴 High Risk</span> : <span className="text-green-600 ml-2">🟢 Low Risk</span>}
                    </h3>
                    <p className="text-gray-600 mt-2">Confidence: {(prediction.confidence * 100).toFixed(2)}%</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

    </div>
  );
}