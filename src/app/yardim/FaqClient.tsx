'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { FAQ_ITEMS, FAQ_TOPICS, type FaqTopic } from './faq';

type TopicFilter = 'all' | FaqTopic;

const normalize = (value: string) => value.toLocaleLowerCase('tr-TR');

export default function FaqClient() {
  const [topic, setTopic] = useState<TopicFilter>('all');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Set<string>>(() => new Set());

  const matchesQuery = useMemo(() => {
    const q = normalize(query.trim());
    return FAQ_ITEMS.filter((item) => !q || normalize(`${item.question} ${item.answer}`).includes(q));
  }, [query]);

  const visible = topic === 'all' ? matchesQuery : matchesQuery.filter((item) => item.topic === topic);
  const countFor = (id: TopicFilter) => (id === 'all' ? matchesQuery.length : matchesQuery.filter((item) => item.topic === id).length);

  const toggle = (id: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const reset = () => {
    setQuery('');
    setTopic('all');
  };

  return (
    <div className="faq">
      <div className="faq__controls">
        <div className="faq-search">
          <label htmlFor="faq-search" className="visually-hidden">Sorularda ara</label>
          <svg className="faq-search__icon" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
            <circle cx="9" cy="9" r="6" />
            <path d="M13.5 13.5L18 18" />
          </svg>
          <input
            id="faq-search"
            type="search"
            className="faq-search__input"
            placeholder="Sorularda ara: kargo, iade, beden…"
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-describedby="faq-result-count"
          />
        </div>

        <fieldset className="segments faq__topics">
          <legend className="visually-hidden">Konu</legend>
          {[{ id: 'all' as TopicFilter, label: 'Tümü' }, ...FAQ_TOPICS].map((item) => (
            <label key={item.id} className="segment">
              <input type="radio" name="faq-topic" value={item.id} checked={topic === item.id} onChange={() => setTopic(item.id)} />
              <span>
                {item.label}
                <span className="segment__count">{countFor(item.id)}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <p id="faq-result-count" className="visually-hidden" aria-live="polite">
          {visible.length} soru listeleniyor
        </p>
      </div>

      {visible.length === 0 ? (
        <div className="faq-empty">
          <p className="faq-empty__title">“{query.trim() || FAQ_TOPICS.find((item) => item.id === topic)?.label}” için bir yanıt bulamadık.</p>
          <p>Farklı bir kelime deneyin ya da sorunuzu bize doğrudan yazın.</p>
          <div className="faq-empty__actions">
            <button type="button" className="btn btn--secondary" onClick={reset}>Aramayı temizle</button>
            <Link href="/iletisim" className="btn btn--link">Bize yaz</Link>
          </div>
        </div>
      ) : (
        <ul className="faq-list">
          {visible.map((item) => {
            const isOpen = open.has(item.id);
            const panelId = `faq-panel-${item.id}`;
            const buttonId = `faq-button-${item.id}`;
            return (
              <li key={item.id} className={`faq-item${isOpen ? ' is-open' : ''}`}>
                <h3 className="faq-item__heading">
                  <button id={buttonId} type="button" className="faq-item__trigger" aria-expanded={isOpen} aria-controls={panelId} onClick={() => toggle(item.id)}>
                    <span>{item.question}</span>
                    <span className="faq-item__icon" aria-hidden="true" />
                  </button>
                </h3>
                <div id={panelId} role="region" aria-labelledby={buttonId} className="faq-item__panel" hidden={!isOpen}>
                  <p>{item.answer}</p>
                  {item.link ? (
                    <Link href={item.link.href} className="guide-arrow-link">{item.link.label}</Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
