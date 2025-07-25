import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function DoctorProfile() {
  const [profile, setProfile] = useState({
    name: '',
    specialization: '',
    phone: '',
    email: '',
    age: '',
    gender: '',
    image: '',
    about: '',
    hospital_user_id: '', // Required by backend for doctors
  });
  const [imagePreview, setImagePreview] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const user_id = localStorage.getItem('userId');

  useEffect(() => {
    if (user_id && user_id.startsWith('DC_')) {
      fetchProfile();
    } else if (!user_id) {
      setMessage('No user ID found. Please log in.');
      console.error('DoctorProfile: No user_id found in localStorage');
    } else {
      setMessage('Invalid doctor user ID. Please log in as a doctor.');
      console.error('DoctorProfile: Invalid user_id format in localStorage');
    }
  }, [user_id]);

  const fetchProfile = async () => {
    setMessage('');
    try {
      const res = await axios.get(`http://localhost:5000/users/${user_id}`, {
        headers: { 'Content-Type': 'application/json' }, // Explicitly set header
      });
      const user = res.data;
      if (user) {
        setProfile({
          name: user.name || '',
          specialization: user.specialization || '',
          phone: user.phone || '',
          email: user.email || '',
          age: user.age || '',
          gender: user.gender || '',
          image: user.image || '',
          about: user.about || '',
          hospital_user_id: user.hospital_user_id || '',
        });
        setImagePreview(user.image || '');
      } else {
        setMessage('Profile not found');
      }
    } catch (err) {
      setMessage(`Failed to fetch profile: ${err.message}. Check server or user ID.`);
      console.error('Error fetching profile:', err);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setMessage('Image size exceeds 5MB');
        return;
      }
      if (!file.type.match('image/png') && !file.type.match('image/jpeg')) {
        setMessage('Only PNG and JPEG images are supported');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile({ ...profile, image: reader.result });
        setImagePreview(reader.result);
        setMessage('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const confirmUpdate = window.confirm('Are you sure you want to update your profile?');
    if (!confirmUpdate) return;

    if (!user_id || !user_id.startsWith('DC_')) {
      setMessage('Cannot update profile: Invalid or missing user ID.');
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const res = await axios.put(`http://localhost:5000/users/${user_id}`, {
        ...profile,
        role: 'doctor', // Ensure role is included
      }, {
        headers: { 'Content-Type': 'application/json' },
      });
      setMessage(res.data.message);
      setEditMode(false);
    } catch (err) {
      setMessage(`Failed to update profile: ${err.response?.data?.message || err.message}.`);
      console.error('Error updating profile:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-xl p-4 sm:p-6 lg:p-8">
        {message && (
          <div
            className={`mb-6 p-4 rounded text-sm font-medium flex justify-between items-center ${
              message.includes('successfully') || message.includes('found')
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            <span>{message}</span>
            <button
              onClick={() => setMessage('')}
              className="text-lg font-bold hover:text-gray-600"
            >
              ×
            </button>
          </div>
        )}

        {(!user_id || !user_id.startsWith('DC_')) && (
          <div className="mb-6 p-4 bg-yellow-100 text-yellow-700 text-sm font-medium rounded-md text-center">
            Please log in with a valid doctor account to view or edit your profile.
          </div>
        )}

        {(user_id && user_id.startsWith('DC_')) && (
          <>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">Doctor Profile</h2>
              <button
                onClick={() => setEditMode(!editMode)}
                className={`px-4 py-2 rounded-md text-white text-sm sm:text-base transition-colors ${
                  editMode
                    ? 'bg-gray-600 hover:bg-gray-700'
                    : 'bg-blue-500 hover:bg-blue-600'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              >
                {editMode ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>

            <div className="flex flex-col md:flex-row gap-6 sm:gap-8">
              {/* Image Section */}
              <div className="md:w-1/3 flex flex-col items-center">
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-blue-200 shadow-md mb-4">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Doctor"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm sm:text-base">
                      No Image
                    </div>
                  )}
                </div>
                {editMode && (
                  <label className="cursor-pointer bg-blue-500 text-white px-3 sm:px-4 py-1.5 rounded-md text-sm hover:bg-blue-600 transition focus:outline-none focus:ring-2 focus:ring-blue-500">
                    Change Photo
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Profile Info */}
              <div className="md:w-2/3">
                {editMode ? (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {['name', 'specialization', 'phone', 'email', 'age'].map((field) => (
                        <div key={field}>
                          <label className="block text-sm font-semibold text-gray-600 capitalize mb-1">
                            {field}
                          </label>
                          <input
                            type={field === 'age' ? 'number' : field === 'email' ? 'email' : 'text'}
                            value={profile[field]}
                            onChange={(e) =>
                              setProfile({ ...profile, [field]: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:outline-none"
                            required={field === 'name'}
                          />
                        </div>
                      ))}
                      <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">
                          Gender
                        </label>
                        <select
                          value={profile.gender}
                          onChange={(e) =>
                            setProfile({ ...profile, gender: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:outline-none"
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-600 mb-1">
                          Hospital User ID
                        </label>
                        <input
                          type="text"
                          value={profile.hospital_user_id}
                          onChange={(e) =>
                            setProfile({ ...profile, hospital_user_id: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:outline-none"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-600 mb-1">
                        About
                      </label>
                      <textarea
                        rows="4"
                        value={profile.about}
                        onChange={(e) =>
                          setProfile({ ...profile, about: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-400 focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="mt-4 px-4 sm:px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[
                        ['Name', profile.name],
                        ['Specialization', profile.specialization],
                        ['Phone', profile.phone],
                        ['Email', profile.email],
                        ['Age', profile.age],
                        ['Gender', profile.gender],
                        ['Hospital User ID', profile.hospital_user_id],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <p className="text-sm text-gray-500">{label}</p>
                          <p className="text-gray-800 font-medium text-sm sm:text-base">
                            {value || '-'}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">About</p>
                      <p className="text-gray-800 whitespace-pre-line text-sm sm:text-base">
                        {profile.about || '-'}
                      </p>
                    </div>
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