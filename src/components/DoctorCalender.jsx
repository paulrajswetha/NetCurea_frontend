import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DoctorCalender = ({ doctor_user_id }) => {
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!doctor_user_id) {
      setError('No doctor user ID provided');
      console.error('DoctorCalendar: No doctor_user_id provided');
      return;
    }

    const fetchAppointments = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/appointments?doctor_user_id=${doctor_user_id}`);
        const appointments = res.data.filter((appt) => appt.doctor_user_id === doctor_user_id);
        console.log(`DoctorCalendar: Fetched ${appointments.length} appointments for ${doctor_user_id}`, appointments);
        const formattedEvents = appointments.map((appt) => ({
          id: appt._id,
          title: `${appt.patient_user_id} - ${appt.time}`,
          start: `${appt.date}T${appt.time}`,
          end: new Date(new Date(`${appt.date}T${appt.time}`).getTime() + 60 * 60 * 1000).toISOString(),
          backgroundColor: appt.status === 'Completed' ? '#28a745' : '#007bff',
        }));
        setEvents(formattedEvents);
        setError(formattedEvents.length === 0 ? `No appointments found for ${doctor_user_id}` : '');
      } catch (err) {
        const errorMessage = err.response?.data?.message || 'Failed to fetch appointments';
        setError(errorMessage);
        console.error(`DoctorCalendar: Error fetching appointments for ${doctor_user_id}`, err);
      }
    };

    fetchAppointments();
  }, [doctor_user_id]);

  return (
    <div className="p-4 sm:p-6 max-w-full sm:max-w-4xl mx-auto">
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 text-sm sm:text-base rounded-md text-center">
          {error}
        </div>
      )}
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin]}
        initialView="timeGridWeek"
        events={events}
        headerToolbar={{
          left: 'prev,next',
          center: 'title',
          right: 'timeGridWeek,dayGridMonth',
        }}
        height="auto"
        contentHeight="auto"
        slotMinTime="08:00:00"
        slotMaxTime="20:00:00"
        eventClick={(info) => {
          console.log(`DoctorCalendar: Clicked event for ${doctor_user_id}`, info.event);
        }}
        dayMaxEvents={true}
        slotLabelFormat={{
          hour: 'numeric',
          minute: '2-digit',
          meridiem: 'short',
        }}
        eventTimeFormat={{
          hour: 'numeric',
          minute: '2-digit',
          meridiem: 'short',
        }}
        className="bg-white rounded-lg shadow-lg p-2 sm:p-4"
      />
    </div>
  );
};

export default DoctorCalender;