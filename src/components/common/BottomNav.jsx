import React from 'react';
import { NavLink } from 'react-router-dom';
import { routes } from '../../routes';
import './BottomNav.css';

export default function BottomNav() {
  const enabledRoutes = routes.filter(r => r.enabled);

  return (
    <nav className="bottom-nav">
      {enabledRoutes.map(route => (
        route.external ? (
          <a
            key={route.id}
            href={route.href}
            target="_blank"
            rel="noopener noreferrer"
            className="bottom-nav__item"
          >
            <span className="bottom-nav__icon">{route.icon}</span>
            <span className="bottom-nav__label">{route.label}</span>
          </a>
        ) : (
          <NavLink
            key={route.id}
            to={route.path}
            className={({ isActive }) =>
              `bottom-nav__item ${isActive ? 'bottom-nav__item--active' : ''}`
            }
          >
            <span className="bottom-nav__icon">{route.icon}</span>
            <span className="bottom-nav__label">{route.label}</span>
          </NavLink>
        )
      ))}
    </nav>
  );
}
