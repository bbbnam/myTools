import React from 'react';
import { Link } from 'react-router-dom';
import { routes } from '../routes';
import './HomePage.css';

export default function HomePage() {
  return (
    <div className="home-page">
      <header className="home-page__header">
        <h1 className="home-page__logo">MY<br />TOOLS</h1>
        <p className="home-page__tagline">당신의 작은 도구 모음</p>
      </header>

      <div className="home-page__grid">
        {routes.map(route => (
          route.enabled ? (
            <Link key={route.id} to={route.path} className="menu-card">
              <span className="menu-card__icon">{route.icon}</span>
              <div>
                <div className="menu-card__label">{route.label}</div>
                <div className="menu-card__desc">{route.description}</div>
              </div>
              <span className="menu-card__arrow">→</span>
            </Link>
          ) : (
            <div key={route.id} className="menu-card menu-card--disabled">
              <span className="menu-card__icon">{route.icon}</span>
              <div>
                <div className="menu-card__label">{route.label}</div>
                <div className="menu-card__desc">{route.description}</div>
              </div>
              <span className="menu-card__badge">준비중</span>
            </div>
          )
        ))}
      </div>
    </div>
  );
}
