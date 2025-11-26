'use client';

import { Send, Bell, MessageSquare, Users, TrendingUp, Activity } from 'lucide-react';

export default function DashboardContent({ user }) {
  const stats = [
    {
      title: 'Total SMS Sent',
      value: '12,345',
      change: '+12.5%',
      icon: Send,
      color: 'from-blue-500 to-blue-600',
    },
    {
      title: 'Push Notifications',
      value: '8,901',
      change: '+8.2%',
      icon: Bell,
      color: 'from-purple-500 to-purple-600',
    },
    {
      title: 'Active Users',
      value: '5,678',
      change: '+5.1%',
      icon: Users,
      color: 'from-green-500 to-green-600',
    },
    {
      title: 'Success Rate',
      value: '98.5%',
      change: '+2.3%',
      icon: TrendingUp,
      color: 'from-indigo-500 to-indigo-600',
    },
  ];

  const recentActivities = [
    { type: 'SMS', message: 'Sent SMS to 100 users', time: '2 minutes ago', status: 'success' },
    { type: 'Push', message: 'Push notification sent', time: '15 minutes ago', status: 'success' },
    { type: 'SMS', message: 'Failed to send SMS to 5 users', time: '1 hour ago', status: 'error' },
    { type: 'Push', message: 'Push notification scheduled', time: '2 hours ago', status: 'pending' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome back, {user?.name || 'User'}! 👋
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Here's what's happening with your notifications today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-lg flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  {stat.change}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {stat.value}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {stat.title}
              </p>
            </div>
          );
        })}
      </div>

      {/* Charts and Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Recent Activities
            </h2>
            <Activity className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div
                key={index}
                className="flex items-start space-x-4 p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    activity.status === 'success'
                      ? 'bg-green-100 dark:bg-green-900/20'
                      : activity.status === 'error'
                      ? 'bg-red-100 dark:bg-red-900/20'
                      : 'bg-yellow-100 dark:bg-yellow-900/20'
                  }`}
                >
                  {activity.type === 'SMS' ? (
                    <Send
                      className={`w-5 h-5 ${
                        activity.status === 'success'
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    />
                  ) : (
                    <Bell
                      className={`w-5 h-5 ${
                        activity.status === 'success'
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-yellow-600 dark:text-yellow-400'
                      }`}
                    />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {activity.message}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <button className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg text-white hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl">
              <Send className="w-8 h-8 mb-2" />
              <span className="font-semibold">Send SMS</span>
            </button>
            <button className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg text-white hover:from-purple-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl">
              <Bell className="w-8 h-8 mb-2" />
              <span className="font-semibold">Push Notification</span>
            </button>
            <button className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-green-500 to-green-600 rounded-lg text-white hover:from-green-600 hover:to-green-700 transition-all shadow-lg hover:shadow-xl">
              <Users className="w-8 h-8 mb-2" />
              <span className="font-semibold">Manage Users</span>
            </button>
            <button className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg text-white hover:from-indigo-600 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl">
              <MessageSquare className="w-8 h-8 mb-2" />
              <span className="font-semibold">View Messages</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

