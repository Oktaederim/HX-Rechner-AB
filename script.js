document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTE AUSWÄHLEN ---
    const inputs = {
        v_flow: document.getElementById('volume-flow'),
        t_initial: document.getElementById('temp-initial'),
        rh_initial: document.getElementById('rh-initial'),
        t_target: document.getElementById('temp-target'),
        rh_target: document.getElementById('rh-target'),
    };

    const outputs = {
        initial: {
            x_g_kg: document.getElementById('x-initial-g-kg'),
            x_g_m3: document.getElementById('x-initial-g-m3'),
            h: document.getElementById('h-initial'),
            td: document.getElementById('td-initial'),
            tw: document.getElementById('tw-initial'),
            rho: document.getElementById('rho-initial'),
        },
        target: {
            x_g_kg: document.getElementById('x-target-g-kg'),
            x_g_m3: document.getElementById('x-target-g-m3'),
            h: document.getElementById('h-target'),
            td: document.getElementById('td-target'),
            tw: document.getElementById('tw-target'),
            rho: document.getElementById('rho-target'),
        },
        process: {
            power_label: document.getElementById('power-label'),
            power_total: document.getElementById('power-total'),
            water_diff: document.getElementById('water-diff'),
        }
    };

    // --- BERECHNUNGSFUNKTION FÜR EINEN ZUSTAND ---
    function calculateState(t, rh) {
        if (isNaN(t) || isNaN(rh)) return null;

        const p = 1013.25; // hPa, atmosphärischer Druck
        
        // Sättigungsdampfdruck (hPa)
        const SDD = 6.112 * Math.exp((17.62 * t) / (243.12 + t));
        // Partialdampfdruck (hPa)
        const DD = (rh / 100) * SDD;
        // Taupunkttemperatur (°C)
        const v = Math.log(DD / 6.112);
        const Td = (243.12 * v) / (17.62 - v);
        // Absolute Feuchte (g/kg)
        const x_g_kg = 622 * (DD / (p - DD));
        // Enthalpie (kJ/kg)
        const h = 1.006 * t + (x_g_kg / 1000) * (2501 + 1.86 * t);
        // Dichte (kg/m³)
        const T_kelvin = t + 273.15;
        const p_v = DD * 100;
        const p_d = (p * 100) - p_v;
        const rho = (p_d / (287.058 * T_kelvin)) + (p_v / (461.52 * T_kelvin));
        // Feuchtkugeltemperatur (°C) - Annäherung nach Stull
        const Tw = t * Math.atan(0.151977 * Math.pow(rh + 8.313659, 0.5)) + Math.atan(t + rh) - Math.atan(rh - 1.676331) + 0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh) - 4.686035;
        // Wassergehalt (g/m³)
        const x_g_m3 = x_g_kg * rho;

        return { t, rh, Td, x_g_kg, x_g_m3, h, rho, Tw };
    }

    // --- HAUPTFUNKTION ZUR AKTUALISIERUNG ---
    function updateAll() {
        const initial_state = calculateState(parseFloat(inputs.t_initial.value), parseFloat(inputs.rh_initial.value));
        const target_state = calculateState(parseFloat(inputs.t_target.value), parseFloat(inputs.rh_target.value));
        const v_flow = parseFloat(inputs.v_flow.value);

        if (!initial_state || !target_state || isNaN(v_flow)) return;

        // UI für Ausgangszustand füllen
        outputs.initial.x_g_kg.textContent = `${initial_state.x_g_kg.toFixed(2)} g/kg`;
        outputs.initial.x_g_m3.textContent = `${initial_state.x_g_m3.toFixed(2)} g/m³`;
        outputs.initial.h.textContent = `${initial_state.h.toFixed(2)} kJ/kg`;
        outputs.initial.td.textContent = `${initial_state.Td.toFixed(1)} °C`;
        outputs.initial.tw.textContent = `${initial_state.Tw.toFixed(1)} °C`;
        outputs.initial.rho.textContent = `${initial_state.rho.toFixed(3)} kg/m³`;

        // UI für Zielzustand füllen
        outputs.target.x_g_kg.textContent = `${target_state.x_g_kg.toFixed(2)} g/kg`;
        outputs.target.x_g_m3.textContent = `${target_state.x_g_m3.toFixed(2)} g/m³`;
        outputs.target.h.textContent = `${target_state.h.toFixed(2)} kJ/kg`;
        outputs.target.td.textContent = `${target_state.Td.toFixed(1)} °C`;
        outputs.target.tw.textContent = `${target_state.Tw.toFixed(1)} °C`;
        outputs.target.rho.textContent = `${target_state.rho.toFixed(3)} kg/m³`;
        
        // --- PROZESSBERECHNUNG ---
        // Massenstrom (kg/s)
        const m_dot = (v_flow * initial_state.rho) / 3600;
        // Enthalpie-Differenz (kJ/kg)
        const h_diff = target_state.h - initial_state.h;
        // Gesamtleistung (kW)
        const power_total = m_dot * h_diff;

        // Wasser-Differenz (kg/h)
        const water_diff_kg_s = m_dot * ( (target_state.x_g_kg - initial_state.x_g_kg) / 1000 );
        const water_diff_kg_h = water_diff_kg_s * 3600;

        // UI für Prozess füllen
        outputs.process.power_label.textContent = power_total > 0 ? "Erforderliche Heizleistung" : "Erforderliche Kühlleistung";
        outputs.process.power_total.textContent = `${Math.abs(power_total).toFixed(2)} kW`;
        outputs.process.power_total.style.color = power_total > 0 ? 'var(--secondary-color)' : 'var(--primary-color)';

        const water_action = water_diff_kg_h > 0 ? "Befeuchtung" : "Entfeuchtung";
        outputs.process.water_diff.textContent = `${Math.abs(water_diff_kg_h).toFixed(2)} kg/h (${water_action})`;

    }

    // --- EVENT LISTENERS ---
    Object.values(inputs).forEach(input => {
        input.addEventListener('input', updateAll);
    });

    // --- ANWENDUNG INITIALISIEREN ---
    updateAll();
});
