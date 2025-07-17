import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  HomeIcon,
  UsersIcon,
  ShoppingBagIcon,
  TruckIcon,
  MapIcon,
  CubeIcon,
  DocumentTextIcon,
  ChartBarIcon,
  CogIcon,
  UserCircleIcon,
  ArrowLeftOnRectangleIcon,
} from '@heroicons/react/24/outline';

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const navigation = [
    {
      name: 'Dashboard',
      href: '/',
      icon: HomeIcon,
      current: location.pathname === '/',
    },
    {
      name: 'Customers',
      href: '/customers',
      icon: UsersIcon,
      current: location.pathname.startsWith('/customers'),
    },
    {
      name: 'Orders',
      href: '/orders',
      icon: ShoppingBagIcon,
      current: location.pathname.startsWith('/orders'),
    },
    {
      name: 'Subscriptions',
      href: '/subscriptions',
      icon: DocumentTextIcon,
      current: location.pathname.startsWith('/subscriptions'),
    },
    {
      name: 'Drivers',
      href: '/drivers',
      icon: TruckIcon,
      current: location.pathname.startsWith('/drivers'),
    },
    {
      name: 'Routes',
      href: '/routes',
      icon: MapIcon,
      current: location.pathname.startsWith('/routes'),
    },
    {
      name: 'Inventory',
      href: '/inventory',
      icon: CubeIcon,
      current: location.pathname.startsWith('/inventory'),
    },
    {
      name: 'Analytics',
      href: '/analytics',
      icon: ChartBarIcon,
      current: location.pathname.startsWith('/analytics'),
    },
  ];

  const handleLogout = () => {
    logout();
    onClose();
  };

  return (
    <>
      {/* Mobile sidebar overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-secondary-600 bg-opacity-75 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 px-4 bg-primary-600">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center mr-3">
                <span className="text-primary-600 font-bold text-lg">💧</span>
              </div>
              <div className="text-white">
                <div className="font-bold text-lg">Hydro</div>
                <div className="text-xs text-primary-100">Admin Panel</div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) =>
                    `${
                      isActive
                        ? 'sidebar-nav-item-active'
                        : 'sidebar-nav-item-inactive'
                    }`
                  }
                  onClick={onClose}
                >
                  <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                  {item.name}
                </NavLink>
              );
            })}
          </nav>

          {/* User section */}
          <div className="border-t border-secondary-200 p-4">
            <div className="flex items-center mb-3">
              <UserCircleIcon className="w-8 h-8 text-secondary-400 mr-3" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-secondary-900 truncate">
                  {user?.username || 'Admin'}
                </div>
                <div className="text-xs text-secondary-500 truncate">
                  {user?.role || 'Administrator'}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <NavLink
                to="/profile"
                className="sidebar-nav-item-inactive text-xs"
                onClick={onClose}
              >
                <CogIcon className="w-4 h-4 mr-2" />
                Settings
              </NavLink>
              
              <button
                onClick={handleLogout}
                className="sidebar-nav-item-inactive text-xs w-full text-left"
              >
                <ArrowLeftOnRectangleIcon className="w-4 h-4 mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;