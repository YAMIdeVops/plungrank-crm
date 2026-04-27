"use client";

import { InputHTMLAttributes, useEffect, useMemo, useRef, useState } from "react";

import { getLeadStatusTone } from "@/shared/lib/lead-status";
import type { Lead } from "@/shared/model/types";

type SearchInputProps = InputHTMLAttributes<HTMLInputElement> & {
  className?: string;
};

type LeadSearchSelectProps = {
  leads: Lead[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  emptyLabel?: string;
  searchPlaceholder?: string;
  formatLeadLabel?: (lead: Lead) => string;
};

function compareText(a: string, b: string) {
  return a.localeCompare(b, "pt-BR", { sensitivity: "base" });
}

function defaultLeadLabel(lead: Lead) {
  return `${lead.nome_contato} - ${lead.nome_empresa}`;
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10.5 4a6.5 6.5 0 1 0 4.09 11.56l4.42 4.42 1.41-1.41-4.42-4.42A6.5 6.5 0 0 0 10.5 4Zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z" />
    </svg>
  );
}

export function SearchInput({ className = "", ...props }: SearchInputProps) {
  return (
    <div className={`search-input-shell ${className}`.trim()}>
      <span className="search-input-icon">
        <SearchIcon />
      </span>
      <input {...props} />
    </div>
  );
}

export function LeadSearchSelect({
  leads,
  value,
  onChange,
  disabled,
  required,
  emptyLabel = "Selecione um lead",
  searchPlaceholder = "Pesquisar lead",
  formatLeadLabel = defaultLeadLabel,
}: LeadSearchSelectProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!value) setQuery("");
  }, [value]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const sortedLeads = useMemo(() => {
    return [...leads].sort((left, right) => {
      const leadNameComparison = compareText(left.nome_contato, right.nome_contato);
      if (leadNameComparison !== 0) return leadNameComparison;
      return compareText(formatLeadLabel(left), formatLeadLabel(right));
    });
  }, [formatLeadLabel, leads]);

  const filteredLeads = useMemo(() => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return sortedLeads;

    const normalizedQuery = trimmedQuery.toLocaleLowerCase("pt-BR");
    const matches = sortedLeads.filter((lead) =>
      formatLeadLabel(lead).toLocaleLowerCase("pt-BR").includes(normalizedQuery),
    );

    if (value && !matches.some((lead) => String(lead.id_lead) === value)) {
      const selectedLead = sortedLeads.find((lead) => String(lead.id_lead) === value);
      return selectedLead ? [selectedLead, ...matches] : matches;
    }

    return matches;
  }, [formatLeadLabel, query, sortedLeads, value]);

  const selectedLead = useMemo(
    () => sortedLeads.find((lead) => String(lead.id_lead) === value),
    [sortedLeads, value],
  );

  function renderLeadOption(lead: Lead) {
    return (
      <span className="lead-picker-option-content">
        <span>{formatLeadLabel(lead)}</span>
        <span className={`lead-status-dot ${getLeadStatusTone(lead.situacao)}`} />
      </span>
    );
  }

  return (
    <div className="field-stack lead-picker" ref={containerRef}>
      <SearchInput
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        placeholder={searchPlaceholder}
        disabled={disabled}
        aria-label={searchPlaceholder}
      />
      <select
        className="lead-picker-native"
        value={value}
        onChange={() => undefined}
        disabled={disabled}
        required={required}
        tabIndex={-1}
        aria-hidden="true"
      >
        <option value="">{emptyLabel}</option>
        {sortedLeads.map((lead) => (
          <option key={lead.id_lead} value={lead.id_lead}>
            {formatLeadLabel(lead)}
          </option>
        ))}
      </select>
      <button
        className="lead-picker-trigger"
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <span className={selectedLead ? "lead-picker-trigger-value" : "lead-picker-trigger-placeholder"}>
          {selectedLead ? renderLeadOption(selectedLead) : emptyLabel}
        </span>
        <span className="lead-picker-chevron" aria-hidden="true">▾</span>
      </button>
      {open ? (
        <div className="lead-picker-menu">
          {filteredLeads.length ? (
            filteredLeads.map((lead) => (
              <button
                key={lead.id_lead}
                className={`lead-picker-option ${String(lead.id_lead) === value ? "active" : ""}`}
                type="button"
                onClick={() => {
                  onChange(String(lead.id_lead));
                  setQuery("");
                  setOpen(false);
                }}
              >
                {renderLeadOption(lead)}
              </button>
            ))
          ) : (
            <div className="lead-picker-empty">Nenhum lead encontrado para esta busca.</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
