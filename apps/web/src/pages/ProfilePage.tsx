import { useAuth } from '../hooks/useAuth';
import { Icon } from '../components/ui/Icon';

// Dummy settings data (to be replaced with backend API in future)
const dummySettings = {
  timezone: 'Europe/Berlin',
  language: 'Deutsch',
  reminderWindows: [90, 60, 30, 14, 7, 1],
  emailNotifications: true,
};

const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateString));
};

function ProfilePage() {
  const { user, signOutUser } = useAuth();

  // Extract user info from Firebase User object with empty string fallbacks
  const userInfo = {
    name: user?.displayName || '',
    email: user?.email || '',
    lastLogin: user?.metadata?.lastSignInTime || '',
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleExportData = () => {
    // Dummy implementation
    alert('Data export feature coming soon');
  };

  const handleDeleteAccount = () => {
    // Dummy implementation
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      alert('Account deletion feature coming soon');
    }
  };

  return (
    <div className="space-y-8">
      {/* User Info Card */}
      <div className="bg-surface rounded-card border border-border p-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-primary-subtle flex items-center justify-center text-primary text-2xl font-semibold">
            {userInfo.name.charAt(0)}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold text-text">{userInfo.name}</h2>
            <p className="text-sm text-muted">{userInfo.email}</p>
          </div>
        </div>
        <div className="pt-4 border-t border-border">
          <p className="text-sm text-muted">
            Last login {formatDate(userInfo.lastLogin)}
          </p>
        </div>
      </div>

      {/* Settings Sections */}
      <div>
        <h3 className="text-lg font-semibold text-text mb-4">Settings</h3>
        <div className="bg-surface rounded-card border border-border overflow-hidden">
          {/* Notification Preferences */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <Icon name="bell" size={20} className="text-muted" />
                <p className="font-medium text-text">Email Notifications</p>
              </div>
              <div className="w-11 h-6 bg-positive rounded-full relative">
                <div className="absolute right-1 top-1 w-4 h-4 bg-surface rounded-full"></div>
              </div>
            </div>
            <p className="text-sm text-muted ml-8">
              Receive reminder emails before renewals
            </p>
          </div>

          {/* Reminder Windows */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3 mb-2">
              <Icon name="calendar" size={20} className="text-muted" />
              <p className="font-medium text-text">Reminder Windows</p>
            </div>
            <div className="ml-8 flex flex-wrap gap-2">
              {dummySettings.reminderWindows.map((days) => (
                <span
                  key={days}
                  className="text-xs px-2 py-1 rounded-full bg-primary-subtle text-primary"
                >
                  {days} days
                </span>
              ))}
            </div>
          </div>

          {/* Timezone */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Icon name="settings" size={20} className="text-muted" />
                <p className="font-medium text-text">Timezone</p>
              </div>
              <p className="text-sm text-muted">{dummySettings.timezone}</p>
            </div>
          </div>

          {/* Language */}
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Icon name="settings" size={20} className="text-muted" />
                <p className="font-medium text-text">Language</p>
              </div>
              <p className="text-sm text-muted">{dummySettings.language}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Account Actions */}
      <div>
        <h3 className="text-lg font-semibold text-text mb-4">Account</h3>
        <div className="space-y-3">
          <button
            onClick={handleExportData}
            className="w-full px-4 py-3 bg-surface border border-border rounded-btn text-text font-medium hover:bg-background focus:outline-none focus:border-primary transition-colors duration-150"
          >
            Export My Data
          </button>

          <button
            onClick={handleSignOut}
            className="w-full px-4 py-3 bg-surface border border-border rounded-btn text-text font-medium hover:bg-background focus:outline-none focus:border-primary transition-colors duration-150 flex items-center justify-center gap-2"
          >
            <Icon name="logout" size={20} />
            Sign Out
          </button>

          <button
            onClick={handleDeleteAccount}
            className="w-full px-4 py-3 bg-negative text-surface rounded-btn font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-negative focus:ring-offset-2 focus:ring-offset-background transition-opacity duration-150"
          >
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
