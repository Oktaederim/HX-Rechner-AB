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
        notification: document.getElementById('notification-area'),
        initial: {
            x_g_kg: document.getElementById('x-initial-g-kg'), x_g_m3: document.getElementById('x-initial-g-m3'),
            h: document.getElementById('h-initial'), td: document.getElementById('td-initial'),
            comfort: document.getElementById('comfort-initial'),
        },
        target: {
            x_g_kg: document.getElementById('x-target-g-kg'), x_g_m3: document.getElementById('x-target-g-m3'),
            h: document.getElementById('h-target'), td: document.getElementById('td-target'),
            comfort: document.getElementById('comfort-target'),
        },
        process: {
            steps: document.getElementById('process-steps'),
            water_diff: document.getElementById('water-diff'),
        }
    };

    // --- HILFSFUNKTIONEN ---
    const showNotification = (message, type = 'error') => {
        outputs.notification.textContent = message;
        outputs.notification.className = `notification ${type}`;
    };
    const clearNotification = () => outputs.notification.className = 'notification hidden';

    const isComfortable = (t, rh) => (t >= 20 && t <= 26 && rh >= 40 && rh <= 60);

    // --- BERECHNUNGSFUNKTION FÜR EINEN ZUSTAND ---
    function calculateState(t, rh) {
        if (isNaN(t) || isNaN(rh)) return null;
        const p = 1013.25;
        const SDD = 6.112 * Math.exp((17.62 * t) / (243.12 + t));
        const DD = (rh / 100) * SDD;
        const v = Math.log(DD / 6.112);
        const Td = (243.12 * v) / (17.62 - v);
        const x_g_kg = 622 * (DD / (p - DD));
        const h = 1.006 * t + (x_g_kg / 1000) * (2501 + 1.86 * t);
        const T_kelvin = t + 273.15;
        const rho = ((p - DD) * 100) / (287.058 * T_kelvin) + (DD * 100) / (461.52 * T_kelvin);
        const x_g_m3 = x_g_kg * rho;
        const comfortable = isComfortable(t, rh);

        return { t, rh, Td, x_g_kg, x_g_m3, h, rho, comfortable };
    }

    // --- HAUPTFUNKTION ZUR AKTUALISIERUNG ---
    function updateAll() {
        // Validierung der Eingaben
        if (parseFloat(inputs.rh_initial.value) > 100 || parseFloat(inputs.rh_target.value) > 100) {
            showNotification('Physikalisch nicht möglich: Relative Feuchte darf 100% nicht überschreiten.');
            return;
        }
        clearNotification();

        const initial_state = calculateState(parseFloat(inputs.t_initial.value), parseFloat(inputs.rh_initial.value));
        const target_state = calculateState(parseFloat(inputs.t_target.value), parseFloat(inputs.rh_target.value));
        const v_flow = parseFloat(inputs.v_flow.value);

        if (!initial_state || !target_state || isNaN(v_flow)) return;

        // UI für Zustände füllen
        const updateStateUI = (state, ui) => {
            ui.x_g_kg.textContent = `${state.x_g_kg.toFixed(2)} g/kg`;
            ui.x_g_m3.textContent = `${state.x_g_m3.toFixed(2)} g/m³`;
            ui.h.textContent = `${state.h.toFixed(2)} kJ/kg`;
            ui.td.textContent = `${state.Td.toFixed(1)} °C`;
            ui.comfort.className = state.comfortable ? 'comfort-status' : 'comfort-status hidden';
        };
        updateStateUI(initial_state, outputs.initial);
        updateStateUI(target_state, outputs.target);

        // --- PROZESSBERECHNUNG ---
        outputs.process.steps.innerHTML = ''; // Prozessschritte zurücksetzen
        const m_dot = (v_flow * initial_state.rho) / 3600;

        // Fall 1: Entfeuchtung (ggf. mit Nacherwärmung)
        if (target_state.x_g_kg < initial_state.x_g_kg) {
            const intermediate_state = calculateState(target_state.Td, 100);
            
            const cooling_power = m_dot * (intermediate_state.h - initial_state.h);
            const heating_power = m_dot * (target_state.h - intermediate_state.h);
            
            outputs.process.steps.innerHTML += `<div class="result-item large"><span class="label">Kühlleistung (bis ${intermediate_state.t.toFixed(1)}°C)</span><span class="value">${Math.abs(cooling_power).toFixed(2)} kW</span></div>`;
            if (heating_power > 0.1) {
                outputs.process.steps.innerHTML += `<div class="result-item large"><span class="label">Heizleistung (Nacherwärmung)</span><span class="value">${heating_power.toFixed(2)} kW</span></div>`;
            }
        } 
        // Fall 2: Befeuchtung, reines Heizen oder Kühlen
        else {
            const total_power = m_dot * (target_state.h - initial_state.h);
            const label = total_power > 0 ? 'Heizleistung' : 'Kühlleistung';
            outputs.process.steps.innerHTML = `<div class="result-item large"><span class="label">${label}</span><span class="value">${Math.abs(total_power).toFixed(2)} kW</span></div>`;
        }
        
        // Wasserbilanz
        const water_diff_kg_h = m_dot * (target_state.x_g_kg - initial_state.x_g_kg) * 3600 / 1000;
        const water_action = water_diff_kg_h > 0 ? 'Befeuchtung' : 'Entfeuchtung';
        outputs.process.water_diff.textContent = `${Math.abs(water_diff_kg_h).toFixed(2)} kg/h (${water_action})`;
    }

    // --- EVENT LISTENERS ---
    Object.values(inputs).forEach(input => input.addEventListener('input', updateAll));

    // --- ANWENDUNG INITIALISIEREN ---
    updateAll();
});
