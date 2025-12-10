import { useState, useRef, useEffect } from 'react';
import { User, Mail, Camera, Upload, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';

interface UserProfilePageProps {
  user: {
    id: number;
    username: string;
    email: string;
    is_admin: boolean;
    profile_picture?: string | null;
  };
  onUpdateProfile: (updates: {
    username?: string;
    email?: string;
    profile_picture?: string | null;
  }) => Promise<void>;
}

export function UserProfilePage({ user, onUpdateProfile }: UserProfilePageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    username: user.username,
    email: user.email
  });

  const [profileImage, setProfileImage] = useState(user.profile_picture || '');
  const [imagePreview, setImagePreview] = useState(user.profile_picture || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Debug logging
  useEffect(() => {
    console.log('UserProfilePage rendered with user:', user);
    console.log('Profile picture:', user.profile_picture);
    console.log('ProfileImage state:', profileImage);
  }, [user, profileImage]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prevent body scroll when image modal is open
  useEffect(() => {
    if (showImageModal) {
      document.body.style.overflow = 'hidden';
      
      // Handle escape key
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setShowImageModal(false);
          setImagePreview(profileImage);
        }
      };
      
      document.addEventListener('keydown', handleEscape);
      
      return () => {
        document.body.style.overflow = 'unset';
        document.removeEventListener('keydown', handleEscape);
      };
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [showImageModal, profileImage]);

  const handleImageClick = () => {
    setShowImageModal(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size should be less than 5MB');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please upload a valid image file');
        return;
      }

      // Store the file for later upload
      setSelectedFile(file);

      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.onerror = () => {
        setError('Failed to read image file');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveImage = async () => {
    if (!selectedFile) {
      setError('Please select an image first');
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      // Step 1: Get presigned URL from backend
      const { upload_url, file_url } = await authAPI.getProfileUploadUrl(selectedFile.type);

      // Step 2: Upload directly to S3
      await authAPI.uploadToS3(upload_url, selectedFile);

      // Step 3: Update profile with the S3 URL
      await onUpdateProfile({ profile_picture: file_url });

      setProfileImage(file_url);
      setImagePreview(file_url);
      setSelectedFile(null);
      setShowImageModal(false);
      setSuccess('Profile picture updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to update profile picture');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveImage = async () => {
    setIsSaving(true);
    setError('');
    try {
      await onUpdateProfile({ profile_picture: '' });
      setProfileImage('');
      setImagePreview('');
      setSelectedFile(null);
      setShowImageModal(false);
      setSuccess('Profile picture removed successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to remove profile picture');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.username.trim()) {
      setError('Username is required');
      return;
    }

    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Please enter a valid email');
      return;
    }

    setIsSaving(true);
    try {
      await onUpdateProfile({
        username: formData.username,
        email: formData.email
      });
      setIsEditing(false);
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      username: user.username,
      email: user.email
    });
    setIsEditing(false);
    setError('');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-gray-900 mb-2">Profile Settings</h1>
        <p className="text-gray-600">Manage your account information and preferences</p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-6 flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <p>{success}</p>
        </div>
      )}

      {error && (
        <div className="mb-6 flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
          <button onClick={() => setError('')} className="ml-auto text-red-600 hover:text-red-700">
            ✕
          </button>
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Profile Picture Section */}
        <div className="p-8 border-b border-gray-200">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-gray-300 group-hover:border-blue-500 transition-all cursor-pointer"
                onClick={handleImageClick}
                style={{ minWidth: '6rem', minHeight: '6rem', maxWidth: '6rem', maxHeight: '6rem' }}
              >
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Profile"
                    className="w-full h-full object-cover object-center"
                    style={{ display: 'block' }}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <span className="text-white text-2xl font-semibold">{user.username.charAt(0).toUpperCase()}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-transparent transition-all flex items-center justify-center pointer-events-none z-10">
                  <Camera className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-gray-900 mb-1">{user.username}</h2>
              <p className="text-gray-600 mb-3">{user.email}</p>
              {user.is_admin && (
                <div className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full">
                  <span>👑</span>
                  Administrator
                </div>
              )}
            </div>
            <button
              onClick={handleImageClick}
              className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2"
            >
              <Camera className="w-4 h-4" />
              Change Photo
            </button>
          </div>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSaveProfile} className="p-8 space-y-6">
          {/* Username */}
          <div>
            <label className="block text-gray-700 mb-2">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                disabled={!isEditing}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-gray-700 mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!isEditing}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      Save Changes
                    </>
                  )}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Edit Profile
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Image Upload Modal */}
      {showImageModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowImageModal(false);
              setImagePreview(profileImage);
            }
          }}
        >
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-gray-900">Profile Picture</h3>
              <button
                onClick={() => {
                  setShowImageModal(false);
                  setImagePreview(profileImage);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {/* Image Preview */}
              <div className="mb-6">
                <div 
                  className="relative w-48 h-48 mx-auto rounded-full overflow-hidden border-4 border-gray-300"
                  style={{ minWidth: '12rem', minHeight: '12rem', maxWidth: '12rem', maxHeight: '12rem' }}
                >
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover object-center"
                      style={{ display: 'block' }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <span className="text-white text-6xl font-semibold">{user.username.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Button */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-4 py-3 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 mb-3"
              >
                <Upload className="w-5 h-5" />
                Upload New Photo
              </button>

              <p className="text-sm text-gray-500 text-center mb-4">
                Maximum file size: 5MB<br />
                Supported formats: JPG, PNG, GIF, WebP
              </p>

              {/* Action Buttons */}
              <div className="flex gap-3">
                {imagePreview && (
                  <button
                    onClick={handleRemoveImage}
                    disabled={isSaving}
                    className="flex-1 px-4 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
                <button
                  onClick={handleSaveImage}
                  disabled={isSaving || !selectedFile}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Photo'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Wrapper component that uses AuthContext for easy integration with App.tsx
export function ProfilePage() {
  const { user, updateProfile } = useAuth();

  if (!user) return null;

  return (
    <UserProfilePage 
      user={user} 
      onUpdateProfile={updateProfile} 
    />
  );
}
