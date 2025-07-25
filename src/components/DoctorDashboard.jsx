import { useEffect, useState } from 'react';
import axios from 'axios';
import Sidebar from './Sidebar';
import DoctorCalender from './DoctorCalender';
import DoctorProfile from './DoctorProfile';
import jsPDF from 'jspdf';

export default function DoctorDashboard() {
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [patients, setPatients] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [hospitals, setHospitals] = useState({});
  const [doctorProfile, setDoctorProfile] = useState({});
  const [prescriptionForm, setPrescriptionForm] = useState({
    patient_user_id: '',
    medication: '',
    dosage: '',
    duration: '',
    duration_unit: 'days',
    frequency: '',
    frequency_unit: 'times per day',
    instructions: '',
    follow_up: false,
  });
  const [recordForm, setRecordForm] = useState({
    patient_user_id: '',
    diagnosis: '',
    treatment: '',
    notes: '',
  });
  const [availabilityForm, setAvailabilityForm] = useState({ date: '', time: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState({
    appointments: false,
    patients: false,
    prescriptions: false,
    records: false,
    availability: false,
    profile: false,
  });
  const [activeSection, setActiveSection] = useState('dashboard');
  const [editPrescriptionId, setEditPrescriptionId] = useState(null);
  const [editRecordId, setEditRecordId] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const user_id = localStorage.getItem('userId');

  useEffect(() => {
    if (!user_id || !user_id.startsWith('DC_')) {
      setMessage('Invalid doctor user ID. Please log in again.');
      console.error('DoctorDashboard: Invalid or missing user_id in localStorage');
      return;
    }
    fetchDoctorProfile();
    fetchAppointments();
    fetchPrescriptions();
    fetchMedicalRecords();
    fetchAvailability();
    fetchPatients();
  }, [user_id]);

  const fetchDoctorProfile = async () => {
    setLoading((prev) => ({ ...prev, profile: true }));
    try {
      const res = await axios.get(`http://localhost:5000/users/${user_id}`);
      if (!res.data.name) throw new Error('Incomplete doctor profile data');
      setDoctorProfile(res.data);
    } catch (err) {
      setMessage('Failed to fetch doctor profile');
      console.error('Error fetching doctor profile:', err);
    } finally {
      setLoading((prev) => ({ ...prev, profile: false }));
    }
  };

  const fetchPatients = async () => {
    setLoading((prev) => ({ ...prev, patients: true }));
    try {
      const res = await axios.get('http://localhost:5000/users?role=patient');
      setPatients(res.data);
      const hospitalData = {};
      await Promise.all(
        res.data.map(async (patient) => {
          if (patient.hospital_user_id) {
            try {
              const hospitalRes = await axios.get(`http://localhost:5000/users/${patient.hospital_user_id}`);
              hospitalData[patient.user_id] = hospitalRes.data;
            } catch (err) {
              console.error(`Error fetching hospital for patient ${patient.user_id}:`, err);
              hospitalData[patient.user_id] = { name: 'Unknown Hospital' };
            }
          } else {
            hospitalData[patient.user_id] = { name: 'No Hospital Assigned' };
          }
        })
      );
      setHospitals(hospitalData);
    } catch (err) {
      setMessage('Failed to fetch patients or hospital data');
      console.error('Error fetching patients:', err);
    } finally {
      setLoading((prev) => ({ ...prev, patients: false }));
    }
  };

  const fetchAppointments = async () => {
    setLoading((prev) => ({ ...prev, appointments: true }));
    try {
      const res = await axios.get(`http://localhost:5000/appointments?doctor_user_id=${user_id}`);
      setAppointments(res.data);
    } catch (err) {
      setMessage('Failed to fetch appointments');
      console.error('Error fetching appointments:', err);
    } finally {
      setLoading((prev) => ({ ...prev, appointments: false }));
    }
  };

  const fetchPrescriptions = async () => {
    setLoading((prev) => ({ ...prev, prescriptions: true }));
    try {
      const res = await axios.get(`http://localhost:5000/prescriptions?doctor_user_id=${user_id}`);
      setPrescriptions(res.data);
    } catch (err) {
      setMessage('Failed to fetch prescriptions');
      console.error('Error fetching prescriptions:', err);
    } finally {
      setLoading((prev) => ({ ...prev, prescriptions: false }));
    }
  };

  const fetchMedicalRecords = async () => {
    setLoading((prev) => ({ ...prev, records: true }));
    try {
      const res = await axios.get(`http://localhost:5000/medical_records?doctor_user_id=${user_id}`);
      setMedicalRecords(res.data);
    } catch (err) {
      setMessage('Failed to fetch medical records');
      console.error('Error fetching medical records:', err);
    } finally {
      setLoading((prev) => ({ ...prev, records: false }));
    }
  };

  const fetchAvailability = async () => {
    setLoading((prev) => ({ ...prev, availability: true }));
    try {
      const res = await axios.get(`http://localhost:5000/availability?doctor_user_id=${user_id}`);
      setAvailability(res.data);
    } catch (err) {
      setMessage('Failed to fetch availability');
      console.error('Error fetching availability:', err);
    } finally {
      setLoading((prev) => ({ ...prev, availability: false }));
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await axios.put(`http://localhost:5000/appointments/${id}`, { status });
      setMessage(`Appointment status updated to ${status}`);
      fetchAppointments();
    } catch (err) {
      setMessage('Failed to update appointment status');
      console.error('Error updating appointment:', err);
    }
  };

  const handlePrescriptionSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!prescriptionForm.patient_user_id.startsWith('PT_')) {
        setMessage('Invalid patient user ID');
        return;
      }
      const prescriptionData = { ...prescriptionForm, doctor_user_id: user_id };
      if (editPrescriptionId) {
        await axios.put(`http://localhost:5000/prescriptions/${editPrescriptionId}`, prescriptionData);
        setMessage('Prescription updated successfully');
      } else {
        await axios.post('http://localhost:5000/prescriptions', prescriptionData);
        setMessage('Prescription added successfully');
      }
      setPrescriptionForm({
        patient_user_id: '',
        medication: '',
        dosage: '',
        duration: '',
        duration_unit: 'days',
        frequency: '',
        frequency_unit: 'times per day',
        instructions: '',
        follow_up: false,
      });
      setEditPrescriptionId(null);
      fetchPrescriptions();
    } catch (err) {
      setMessage(`Failed to ${editPrescriptionId ? 'update' : 'save'} prescription: ${err.response?.data?.message || err.message}`);
      console.error('Error saving prescription:', err);
    }
  };

  const handleEditPrescription = (prescription) => {
    setPrescriptionForm({
      patient_user_id: prescription.patient_user_id,
      medication: prescription.medication,
      dosage: prescription.dosage,
      duration: prescription.duration || '',
      duration_unit: prescription.duration_unit || 'days',
      frequency: prescription.frequency || '',
      frequency_unit: prescription.frequency_unit || 'times per day',
      instructions: prescription.instructions || '',
      follow_up: prescription.follow_up || false,
    });
    setEditPrescriptionId(prescription._id);
  };

  const handleDeletePrescription = async (id) => {
    if (window.confirm('Are you sure you want to delete this prescription?')) {
      try {
        await axios.delete(`http://localhost:5000/prescriptions/${id}`, { params: { doctor_user_id: user_id } });
        setMessage('Prescription deleted successfully');
        fetchPrescriptions();
      } catch (err) {
        setMessage(`Failed to delete prescription: ${err.response?.data?.message || err.message}`);
        console.error('Error deleting prescription:', err);
      }
    }
  };

  const handleRecordSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!recordForm.patient_user_id.startsWith('PT_')) {
        setMessage('Invalid patient user ID');
        return;
      }
      const recordData = { ...recordForm, doctor_user_id: user_id };
      if (editRecordId) {
        await axios.put(`http://localhost:5000/medical_records/${editRecordId}`, recordData);
        setMessage('Medical record updated successfully');
      } else {
        await axios.post('http://localhost:5000/medical_records', recordData);
        setMessage('Medical record added successfully');
      }
      setRecordForm({
        patient_user_id: '',
        diagnosis: '',
        treatment: '',
        notes: '',
      });
      setEditRecordId(null);
      fetchMedicalRecords();
    } catch (err) {
      setMessage(`Failed to ${editRecordId ? 'update' : 'save'} medical record: ${err.response?.data?.message || err.message}`);
      console.error('Error saving medical record:', err);
    }
  };

  const handleEditRecord = (record) => {
    setRecordForm({
      patient_user_id: record.patient_user_id,
      diagnosis: record.diagnosis,
      treatment: record.treatment || '',
      notes: record.notes || '',
    });
    setEditRecordId(record._id);
  };

  const handleDeleteRecord = async (id) => {
    if (window.confirm('Are you sure you want to delete this medical record?')) {
      try {
        await axios.delete(`http://localhost:5000/medical_records/${id}`, { params: { doctor_user_id: user_id } });
        setMessage('Medical record deleted successfully');
        fetchMedicalRecords();
      } catch (err) {
        setMessage(`Failed to delete medical record: ${err.response?.data?.message || err.message}`);
        console.error('Error deleting medical record:', err);
      }
    }
  };

  const handleAvailabilitySubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/availability', {
        ...availabilityForm,
        doctor_user_id: user_id,
      });
      setMessage('Availability added successfully');
      setAvailabilityForm({ date: '', time: '' });
      fetchAvailability();
    } catch (err) {
      setMessage('Failed to add availability');
      console.error('Error adding availability:', err);
    }
  };

  const deleteAvailability = async (id) => {
    if (!window.confirm('Are you sure you want to delete this availability slot?')) return;
    try {
      await axios.delete(`http://localhost:5000/availability/${id}`, { params: { doctor_user_id: user_id } });
      setMessage('Availability deleted successfully');
      fetchAvailability();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to delete availability');
      console.error('Error deleting availability:', err);
    }
  };

  const downloadBillPDF = (appt) => {
    const doc = new jsPDF();
    const patient = patients.find(p => p.user_id === appt.patient_user_id) || { name: 'Unknown Patient' };
    const hospital = hospitals[appt.patient_user_id] || { name: 'Unknown Hospital' };
    doc.setFontSize(16);
    doc.text('Appointment Bill', 20, 20);
    doc.setFontSize(12);
    doc.text(`Appointment ID: ${appt._id}`, 20, 30);
    doc.text(`Token Number: ${appt.token_seq || appt.token_number || 'N/A'}`, 20, 40);
    doc.text(`Patient: ${patient.name}`, 20, 50);
    doc.text(`Doctor: ${doctorProfile.name || 'Unknown Doctor'}`, 20, 60);
    doc.text(`Hospital: ${hospital.name}`, 20, 70);
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
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}
      >
        {status}
      </span>
    );
  };

  const isLoading = Object.values(loading).some((status) => status);

  // Find the current appointment (Scheduled or In Progress, earliest by date/time)
  const currentAppointment = appointments
    .filter(a => ['Scheduled', 'In Progress'].includes(a.status))
    .sort((a, b) => new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time))[0];

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar role="doctor" onSectionChange={setActiveSection} />
      <div className="flex-1 p-4 sm:p-6 md:ml-64 sm:ml-0">
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

        {activeSection === 'dashboard' && (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 text-gray-800">Doctor Dashboard</h2>
            {/* Current appointment info */}
            {currentAppointment && (
              <div className="mb-4 p-4 bg-blue-50 border-l-4 border-blue-400 text-blue-800 rounded shadow max-w-xl">
                <div className="font-bold text-lg mb-1">Current Appointment</div>
                <div>Date: {new Date(currentAppointment.date).toLocaleDateString()}</div>
                <div>Time: {currentAppointment.time}</div>
                <div>Token Number: {currentAppointment.token_seq || currentAppointment.token_number || 'N/A'}</div>
                <div>Patient: {patients.find(p => p.user_id === currentAppointment.patient_user_id)?.name || currentAppointment.patient_user_id}</div>
              </div>
            )}
            <p className="text-sm sm:text-base text-gray-600 pt-10">
              Welcome to your dashboard. Use the sidebar to manage appointments, prescriptions, medical records, and availability.
            </p>
            <br />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="bg-blue-50 rounded-lg p-4 shadow">
                <h3 className="text-base sm:text-lg font-semibold text-gray-700">Upcoming Appointments</h3>
                <p className="text-2xl sm:text-3xl font-bold text-blue-600">
                  {appointments.filter(a => ['Scheduled', 'In Progress'].includes(a.status)).length}
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
            <br />
            {appointments.length === 0 ? (
              <p className="text-gray-500 text-sm sm:text-base">No appointments scheduled.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white rounded-lg">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
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
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-900">{appt.time}</td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-900">
                          {new Date(appt.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-900">{appt.token_seq || appt.token_number || 'N/A'}</td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-900">{getStatusBadge(appt.status)}</td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-900 max-w-[200px] truncate">{appt.notes || '-'}</td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-900">
                          {['Scheduled', 'In Progress'].includes(appt.status) && (
                            <button
                              onClick={() => updateStatus(appt._id, 'Completed')}
                              className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 mr-2"
                            >
                              Complete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeSection === 'profile' && <DoctorProfile />}

        {activeSection === 'appointments' && (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-6 text-gray-800">Appointments</h2>
            {appointments.length === 0 ? (
              <p className="text-gray-500 text-sm sm:text-base">No appointments scheduled.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white rounded-lg">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
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
                          <button
                            className="text-blue-600 hover:text-blue-900 underline"
                            onClick={() => setSelectedPatient(patients.find(p => p.user_id === appt.patient_user_id) || null)}
                          >
                            {patients.find(p => p.user_id === appt.patient_user_id)?.name || appt.patient_user_id}
                          </button>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-900">{appt.time}</td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-900">
                          {new Date(appt.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-900">{appt.token_seq || appt.token_number || 'N/A'}</td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-900">{getStatusBadge(appt.status)}</td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-900 max-w-[200px] truncate">{appt.notes || '-'}</td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-900">
                          {['Scheduled', 'In Progress'].includes(appt.status) && (
                            <button
                              onClick={() => updateStatus(appt._id, 'Completed')}
                              className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 mr-2"
                            >
                              Complete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-6">
              <DoctorCalender doctor_user_id={user_id} />
            </div>
          </div>
        )}

        {activeSection === 'prescriptions' && (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-6 text-gray-800">Prescriptions</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div className="bg-gray-50 p-4 sm:p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">{editPrescriptionId ? 'Edit Prescription' : 'Add New Prescription'}</h3>
                <form onSubmit={handlePrescriptionSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Patient</label>
                    <select
                      value={prescriptionForm.patient_user_id}
                      onChange={(e) => setPrescriptionForm({ ...prescriptionForm, patient_user_id: e.target.value })}
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select Patient</option>
                      {patients.map((patient) => (
                        <option key={patient.user_id} value={patient.user_id}>
                          {patient.name} ({patient.user_id})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Medication</label>
                    <input
                      type="text"
                      value={prescriptionForm.medication}
                      onChange={(e) => setPrescriptionForm({ ...prescriptionForm, medication: e.target.value })}
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Dosage</label>
                    <input
                      type="text"
                      value={prescriptionForm.dosage}
                      onChange={(e) => setPrescriptionForm({ ...prescriptionForm, dosage: e.target.value })}
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                      <div className="flex">
                        <input
                          type="number"
                          value={prescriptionForm.duration}
                          onChange={(e) => setPrescriptionForm({ ...prescriptionForm, duration: e.target.value })}
                          className="w-3/4 px-3 py-2 border rounded-l focus:ring-2 focus:ring-blue-500"
                          min="1"
                        />
                        <select
                          value={prescriptionForm.duration_unit}
                          onChange={(e) => setPrescriptionForm({ ...prescriptionForm, duration_unit: e.target.value })}
                          className="w-1/4 px-3 py-2 border-l-0 border rounded-r focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="days">Days</option>
                          <option value="weeks">Weeks</option>
                          <option value="months">Months</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                      <div className="flex">
                        <input
                          type="number"
                          value={prescriptionForm.frequency}
                          onChange={(e) => setPrescriptionForm({ ...prescriptionForm, frequency: e.target.value })}
                          className="w-3/4 px-3 py-2 border rounded-l focus:ring-2 focus:ring-blue-500"
                          min="1"
                        />
                        <select
                          value={prescriptionForm.frequency_unit}
                          onChange={(e) => setPrescriptionForm({ ...prescriptionForm, frequency_unit: e.target.value })}
                          className="w-1/4 px-3 py-2 border-l-0 border rounded-r focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="times per day">Per day</option>
                          <option value="times per week">Per week</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="follow-up"
                      checked={prescriptionForm.follow_up}
                      onChange={(e) => setPrescriptionForm({ ...prescriptionForm, follow_up: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="follow-up" className="ml-2 block text-sm text-gray-700">Follow-up Required</label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Instructions</label>
                    <textarea
                      value={prescriptionForm.instructions}
                      onChange={(e) => setPrescriptionForm({ ...prescriptionForm, instructions: e.target.value })}
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                      rows="3"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {editPrescriptionId ? 'Update' : 'Add'} Prescription
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPrescriptionForm({
                          patient_user_id: '',
                          medication: '',
                          dosage: '',
                          duration: '',
                          duration_unit: 'days',
                          frequency: '',
                          frequency_unit: 'times per day',
                          instructions: '',
                          follow_up: false,
                        });
                        setEditPrescriptionId(null);
                      }}
                      className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                      Clear
                    </button>
                  </div>
                </form>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">Current Prescriptions</h3>
                {prescriptions.length === 0 ? (
                  <p className="text-gray-500 text-sm sm:text-base">No prescriptions found.</p>
                ) : (
                  <div className="space-y-4">
                    {prescriptions.map((prescription) => (
                      <div key={prescription._id} className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                          <div>
                            <h4 className="font-medium text-base sm:text-lg">{prescription.medication}</h4>
                            <p className="text-sm text-gray-600">
                              For: {patients.find(p => p.user_id === prescription.patient_user_id)?.name || prescription.patient_user_id}
                            </p>
                            <p className="text-sm text-gray-600">Prescribed by: {prescription.doctor_user_id}</p>
                          </div>
                          <div className="flex space-x-2 mt-2 sm:mt-0">
                            <button
                              onClick={() => handleEditPrescription(prescription)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Edit"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeletePrescription(prescription._id)}
                              className="text-red-600 hover:text-red-800"
                              title="Delete"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <div className="mt-2 text-sm space-y-1">
                          <p><span className="font-medium">Dosage:</span> {prescription.dosage}</p>
                          <p><span className="font-medium">Duration:</span> {prescription.duration || '-'} {prescription.duration_unit || ''}</p>
                          <p><span className="font-medium">Frequency:</span> {prescription.frequency || '-'} {prescription.frequency_unit || ''}</p>
                          {prescription.instructions && <p><span className="font-medium">Instructions:</span> {prescription.instructions}</p>}
                          <p><span className="font-medium">Follow-up:</span> {prescription.follow_up ? 'Required' : 'Not Required'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'records' && (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-6 text-gray-800">Medical Records</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <div className="bg-gray-50 p-4 sm:p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">{editRecordId ? 'Edit Medical Record' : 'Add New Medical Record'}</h3>
                <form onSubmit={handleRecordSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Patient</label>
                    <select
                      value={recordForm.patient_user_id}
                      onChange={(e) => setRecordForm({ ...recordForm, patient_user_id: e.target.value })}
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select Patient</option>
                      {patients.map((patient) => (
                        <option key={patient.user_id} value={patient.user_id}>
                          {patient.name} ({patient.user_id})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis</label>
                    <textarea
                      value={recordForm.diagnosis}
                      onChange={(e) => setRecordForm({ ...recordForm, diagnosis: e.target.value })}
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                      rows="3"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Treatment</label>
                    <textarea
                      value={recordForm.treatment}
                      onChange={(e) => setRecordForm({ ...recordForm, treatment: e.target.value })}
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                      rows="3"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                      value={recordForm.notes}
                      onChange={(e) => setRecordForm({ ...recordForm, notes: e.target.value })}
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                      rows="3"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {editRecordId ? 'Update' : 'Add'} Record
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRecordForm({ patient_user_id: '', diagnosis: '', treatment: '', notes: '' });
                        setEditRecordId(null);
                      }}
                      className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                      Clear
                    </button>
                  </div>
                </form>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">Patient Records</h3>
                {medicalRecords.length === 0 ? (
                  <p className="text-gray-500 text-sm sm:text-base">No medical records found.</p>
                ) : (
                  <div className="space-y-4">
                    {medicalRecords.map((record) => (
                      <div key={record._id} className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                          <div>
                            <h4 className="font-medium text-base sm:text-lg">
                              Record for {patients.find(p => p.user_id === record.patient_user_id)?.name || record.patient_user_id}
                            </h4>
                            <p className="text-sm text-gray-500">{new Date(record.date).toLocaleDateString()}</p>
                            <p className="text-sm text-gray-600">By: {record.doctor_user_id}</p>
                          </div>
                          <div className="flex space-x-2 mt-2 sm:mt-0">
                            <button
                              onClick={() => handleEditRecord(record)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Edit"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteRecord(record._id)}
                              className="text-red-600 hover:text-red-800"
                              title="Delete"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <div className="mt-4 space-y-2 text-sm">
                          <div><h5 className="font-medium text-gray-700">Diagnosis:</h5><p className="text-gray-800">{record.diagnosis}</p></div>
                          <div><h5 className="font-medium text-gray-700">Treatment:</h5><p className="text-gray-800">{record.treatment || '-'}</p></div>
                          {record.notes && <div><h5 className="font-medium text-gray-700">Notes:</h5><p className="text-gray-800">{record.notes}</p></div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeSection === 'availability' && (
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h2 className="text-xl sm:text-2xl font-bold mb-6 text-gray-800">Availability</h2>
            <div className="bg-gray-50 p-4 sm:p-6 rounded-lg mb-6">
              <h3 className="text-lg font-semibold mb-4">Add New Availability Slot</h3>
              <form onSubmit={handleAvailabilitySubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={availabilityForm.date}
                      onChange={(e) => setAvailabilityForm({ ...availabilityForm, date: e.target.value })}
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                    <input
                      type="time"
                      value={availabilityForm.time}
                      onChange={(e) => setAvailabilityForm({ ...availabilityForm, time: e.target.value })}
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Add Availability
                </button>
              </form>
            </div>
            <h3 className="text-lg font-semibold mb-4">Your Unbooked Availability Slots</h3>
            {availability.length === 0 ? (
              <p className="text-gray-500 text-sm sm:text-base">No unbooked availability slots added.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white rounded-lg">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {availability.map((slot) => (
                      <tr key={slot._id} className="hover:bg-gray-50">
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-900">{new Date(slot.date).toLocaleDateString()}</td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-900">{slot.time}</td>
                        <td className="px-4 sm:px-6 py-4 text-sm text-gray-900">
                          <button
                            onClick={() => deleteAvailability(slot._id)}
                            className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                          >
                            Delete
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