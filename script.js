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
            x_g_kg: document.getElementById('x-initial-g-kg'), h: document.getElementById('h-initial'),
            td: document.getElementById('td-initial'), tw: document.getElementById('tw-initial'),
            comfort: document.getElementById('comfort-initial'),
        },
        target: {
            x_g_kg: document.getElementById('x-target-g-kg'), h: document.getElementById('h-target'),
            td: document.getElementById('td-target'), tw: document.getElementById('tw-target'),
            comfort: document.getElementById('comfort-target'),
        },
        process: {
            power_heat: document.getElementById('power-heat'),
            power_cool: document.getElementById('power-cool'),
            water_diff: document.getElementById('water-diff'),
            explanation: document.getElementById('explanation-dehumidification'),
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
        const Tw = t * Math.atan(0.151977 * Math.pow(rh + 8.313659, 0.5)) + Math.atan(t + rh) - Math.atan(rh - 1.676331) + 0.00391838 * Math.pow(rh, 1.5) * Math.atan(0.023101 * rh) - 4.686035;
        const comfortable = isComfortable(t, rh);

        return { t, rh, Td, x_g_kg, h, rho, Tw, comfortable };
    }

    // --- HAUPTFUNKTION ZUR AKTUALISIERUNG ---
    function updateAll() {
        // Validierung
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
            ui.h.textContent = `${state.h.toFixed(2)} kJ/kg`;
            ui.td.textContent = `${state.Td.toFixed(1)} °C`;
            ui.tw.textContent = `${state.Tw.toFixed(1)} °C`;
            ui.comfort.className = state.comfortable ? 'comfort-status' : 'comfort-status hidden';
        };
        updateStateUI(initial_state, outputs.initial);
        updateStateUI(target_state, outputs.target);

        // --- PROZESSBERECHNUNG ---
        const m_dot = (v_flow * initial_state.rho) / 3600;
        let cooling_power = 0;
        let heating_power = 0;
        
        // Fall 1: Entfeuchtung (ggf. mit Nacherwärmung)
        if (target_state.x_g_kg < initial_state.x_g_kg) {
            const intermediate_state = calculateState(target_state.Td, 100);
            cooling_power = m_dot * (intermediate_state.h - initial_state.h);
            heating_power = m_dot * (target_state.h - intermediate_state.h);
            const cooler_temp_example = (target_state.Td - 3).toFixed(1);
            outputs.process.explanation.innerHTML = `<strong>Entfeuchtungsprozess:</strong> Um die Luft auf den Ziel-Taupunkt von <strong>${target_state.Td.toFixed(1)}°C</strong> zu entfeuchten, muss sie am Kühler auf diesen Wert abgekühlt werden. In der Praxis benötigt man dafür eine Kühlwassertemperatur von ca. <strong>${cooler_temp_example}°C</strong>. Anschließend wird die Luft ggf. wieder aufgeheizt.`;
        } 
        // Fall 2: Befeuchtung, reines Heizen oder Kühlen
        else {
            const total_power = m_dot * (target_state.h - initial_state.h);
            if (total_power > 0) heating_power = total_power;
            else cooling_power = total_power;
            outputs.process.explanation.innerHTML = `<strong>Entfeuchtungsprozess:</strong> Bei diesem Prozess ist keine Entfeuchtung nötig, da die absolute Feuchte gleich bleibt oder zunimmt. Die Luft wird direkt gekühlt, geheizt oder befeuchtet.`;
        }
        
        // Leistungs-UI
        outputs.process.power_heat.textContent = `${Math.abs(heating_power).toFixed(2)} kW`;
        outputs.process.power_cool.textContent = `${Math.abs(cooling_power).toFixed(2)} kW`;
        
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
