'use client';

import { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { 
  Send, 
  Settings, 
  Users, 
  CheckCircle, 
  MessageSquare,
  Phone,
  X,
  Loader2,
  Image as ImageIcon,
  Bell
} from 'lucide-react';

export default function PushPage() {
  const [selectedSender, setSelectedSender] = useState('');
  const [selectedPhones, setSelectedPhones] = useState([]);
  const [message, setMessage] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [twilioAccounts, setTwilioAccounts] = useState([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);

  // Phone numbers to display (without +) - same as SMS page
  const phoneNumbers = [
    { id: 1, number: '92 337 0612601', value: '923370612601', friendlyName: '' },
    { id: 2, number: '91 98219 89278', value: '919821989278', friendlyName: '' },
  ];

  // Fetch Twilio accounts
  useEffect(() => {
    fetchTwilioAccounts();
  }, []);

  const fetchTwilioAccounts = async () => {
    try {
      const response = await fetch('/api/sms/accounts');
      if (response.ok) {
        const data = await response.json();
        setTwilioAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error('Error fetching Twilio accounts:', error);
    } finally {
      setIsLoadingAccounts(false);
    }
  };

  const handlePhoneToggle = (phoneValue) => {
    setSelectedPhones(prev => 
      prev.includes(phoneValue)
        ? prev.filter(p => p !== phoneValue)
        : [...prev, phoneValue]
    );
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedPhones(phoneNumbers.map(p => p.value));
    } else {
      setSelectedPhones([]);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear the message?')) {
      setMessage('');
      setSelectedPhones([]);
      setImageFile(null);
      setImagePreview(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    if (selectedPhones.length === 0) {
      toast.error('Please select at least one recipient');
      return;
    }

    if (!selectedSender) {
      toast.error('Please select a Twilio account');
      return;
    }

    if (!imageFile) {
      toast.error('Please select an image for MMS');
      return;
    }

    setIsSending(true);

    try {
      // Step 1: Upload image to get public URL
      setIsUploading(true);
      const uploadFormData = new FormData();
      uploadFormData.append('image', imageFile);

      const uploadResponse = await fetch('/api/push/upload-image', {
        method: 'POST',
        body: uploadFormData,
      });

      const uploadData = await uploadResponse.json();

      if (!uploadResponse.ok || !uploadData.success) {
        // Show helpful error message with solutions
        if (uploadData.solutions) {
          const solutionText = uploadData.solutions.map(s => 
            `${s.title}\n${s.steps.join('\n')}`
          ).join('\n\n');
          toast.error(
            `${uploadData.error}\n\n${solutionText}`,
            { duration: 10000 }
          );
        } else {
          toast.error(uploadData.error || 'Image upload failed', {
            duration: 6000,
          });
        }
        throw new Error(uploadData.error || 'Failed to upload image');
      }

      setIsUploading(false);

      // Step 2: Send MMS with image URL
      const formData = new FormData();
      formData.append('message', message.trim());
      formData.append('image_url', uploadData.url);
      formData.append('sender', selectedSender);
      formData.append('selected_phones', selectedPhones.join(','));

      const response = await fetch('/api/push/send-mms', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send MMS');
      }

      if (data.errorCount > 0) {
        toast.warning(`${data.message}`);
      } else {
        toast.success(`MMS sent successfully to ${data.successCount} recipient(s)!`);
      }

      // Clear form on success
      setMessage('');
      setSelectedPhones([]);
      setImageFile(null);
      setImagePreview(null);
    } catch (error) {
      console.error('Error sending MMS:', error);
      toast.error(error.message || 'Failed to send MMS. Please try again.');
    } finally {
      setIsSending(false);
      setIsUploading(false);
    }
  };

  const formatSenderOption = (account) => {
    return `${account.accountSid}|${account.authToken}|${account.phoneNumber}|${account.friendlyName}`;
  };

  return (
    <>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1f2937',
            color: '#fff',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid #374151',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Push Notifications (MMS)
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Send MMS with images to phone numbers via Twilio
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Sidebar - Configuration */}
            <div className="lg:col-span-4 xl:col-span-3">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center mr-3">
                    <Settings className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Configuration
                  </h2>
                </div>

                {/* Twilio Account Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Twilio Account
                  </label>
                  {isLoadingAccounts ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    </div>
                  ) : (
                    <select
                      className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                      value={selectedSender}
                      onChange={(e) => setSelectedSender(e.target.value)}
                      required
                    >
                      <option value="">-- Select Account --</option>
                      {twilioAccounts.map((account, index) => (
                        <option key={index} value={formatSenderOption(account)}>
                          {account.friendlyName} - {account.phoneNumber}
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                    Select your Twilio account to send MMS
                  </p>
                </div>

                {/* Recipients Section */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Recipients
                    </label>
                    <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-semibold px-2.5 py-1 rounded-lg">
                      {selectedPhones.length}
                    </span>
                  </div>

                  {/* Select All */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-3">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 dark:bg-gray-700 dark:ring-offset-gray-800"
                        checked={selectedPhones.length === phoneNumbers.length && phoneNumbers.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                      <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        Select All
                      </span>
                    </label>
                  </div>

                  {/* Phone Numbers List */}
                  <div className="max-h-[400px] overflow-y-auto overflow-x-hidden pr-2 space-y-2 custom-scrollbar">
                    {phoneNumbers.map((phone) => (
                      <div
                        key={phone.id}
                        className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="w-4 h-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded focus:ring-indigo-500 dark:bg-gray-700 dark:ring-offset-gray-800 flex-shrink-0"
                            checked={selectedPhones.includes(phone.value)}
                            onChange={() => handlePhoneToggle(phone.value)}
                          />
                          <div className="ml-3 flex items-center flex-1 min-w-0">
                            <Phone className="w-4 h-4 text-indigo-500 mr-2 flex-shrink-0" />
                            <span className="text-sm font-mono text-gray-800 dark:text-gray-200 break-all">
                              {phone.number}
                            </span>
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>

                  {phoneNumbers.length === 0 && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-sm text-yellow-800 dark:text-yellow-200">
                      ⚠️ No phone numbers found
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Side - Message Composition */}
            <div className="lg:col-span-8 xl:col-span-9 space-y-6">
              {/* Message Composition Card */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                    <Bell className="w-5 h-5 text-white" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Compose MMS
                  </h2>
                </div>

                {/* Message Textarea */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Message Content <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-y min-h-[200px] text-sm"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your message here..."
                    required
                  />
                  <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      MMS via Twilio
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {message.length} characters
                    </p>
                  </div>
                </div>

                {/* Image Upload */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Image <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-4">
                    <label className="flex-1 cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                        id="image-upload"
                        required
                      />
                      <div className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors">
                        <div className="text-center">
                          <ImageIcon className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {imageFile ? imageFile.name : 'Click to upload image (Required for MMS)'}
                          </span>
                        </div>
                      </div>
                    </label>
                    {imagePreview && (
                      <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setImageFile(null);
                            setImagePreview(null);
                          }}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                    Maximum file size: 5MB. Supported formats: JPG, PNG, GIF
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-end flex-wrap">
                  <button
                    type="button"
                    onClick={handleClear}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-all flex items-center"
                  >
                    <X className="w-4 h-4 mr-1.5" />
                    Clear
                  </button>
                  <button
                    type="submit"
                    disabled={isSending || isUploading}
                    className="px-4 py-2 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-lg font-medium text-sm hover:from-indigo-600 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed flex items-center"
                  >
                    {isSending || isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                        {isUploading ? 'Uploading...' : 'Sending...'}
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-1.5" />
                        Send MMS
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <Phone className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    {phoneNumbers.length}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Total Numbers
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    {selectedPhones.length}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Selected
                  </p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <MessageSquare className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    {message.length}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Message Length
                  </p>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #6366f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #4f46e5;
        }
        @media (prefers-color-scheme: dark) {
          .custom-scrollbar::-webkit-scrollbar-track {
            background: #374151;
          }
        }
      `}</style>
    </>
  );
}
