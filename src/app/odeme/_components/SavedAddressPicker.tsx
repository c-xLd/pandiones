import React from 'react';

export type SavedAddress = {
  id: string;
  title: string;
  recipient?: string | null;
  phone?: string | null;
  address: string;
  district: string;
  city: string;
  isDefault?: boolean;
};

type Props = {
  addresses: SavedAddress[];
  selectedId: string | null;
  onSelect: (address: SavedAddress) => void;
};

export default function SavedAddressPicker({ addresses, selectedId, onSelect }: Props) {
  return (
    <fieldset className="choice-group">
      <legend className="choice-group__legend">Kayıtlı adreslerinizden seçin</legend>
      <div className="choice-group__options">
        {addresses.map((address) => (
          <label key={address.id} className="choice-card">
            <input
              type="radio"
              className="choice-card__input"
              name="savedAddress"
              value={address.id}
              checked={selectedId === address.id}
              onChange={() => onSelect(address)}
            />
            <span className="choice-card__title">
              {address.title}
              <span className="choice-card__check">Seçili</span>
            </span>
            <span className="choice-card__meta">{address.address}</span>
            <span className="choice-card__meta">{address.district} / {address.city}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
