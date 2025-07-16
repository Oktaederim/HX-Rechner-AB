document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTE AUSWÄHLEN ---
    const tempInput = document.getElementById('temperature');
    const humidityInput = document.getElementById('humidity');
    const modeToggle = document.getElementById('mode-toggle');

    const expertViews = document.querySelectorAll('.expert-view');
    
    // Ausgabe-Elemente
    const dewPointValue = document.getElementById('dew-point-value');
    const absHumidityValue = document.getElementById('absolute-humidity-value');
    const enthalpyValue = document.getElementById('enthalpy-value');
    const wetBulbValue = document.getElementById('wet-bulb-value');
    const densityValue = document.getElementById('density-value');
    const specificVolumeValue = document.getElementById('specific-volume-value');
    

    // --- BERECHNUNGSFUNKTION ---
    function calculatePsychrometrics() {
        const t = parseFloat(tempInput.value); // Temperatur in °C
        const rh = parseFloat(humidityInput.value); // Relative Feuchte in %

        if (isNaN(t) || isNaN(rh)) {
            return; // Beenden, wenn Eingaben ungültig sind
        }

        // --- KERNFORMELN DER PSYCHROMETRIE ---

        // 1. Sättigungsdampfdruck (Magnus-Formel)
        const SDD = 6.112 * Math.exp((17.62 * t) / (243.12 + t)); // in hPa

        // 2. Partialdampfdruck
        const DD = (rh / 100) * SDD; // in hPa

        // 3. Taupunkttemperatur
        const v = Math.log(DD / 6.112);
        const Td = (243.12 * v) / (17.62 - v); // in °C

        // 4. Absolute Feuchte (x) in g/kg
        // p = atmosphärischer Druck, ca. 1013.25 hPa auf Meereshöhe
        const p = 1013.25; 
        const x = 622 * (DD / (p - DD)); // in g Wasser / kg trockene Luft

        // 5. Enthalpie (h) in kJ/kg
        // h = 1.006*t + x/1000 * (2501 + 1.86*t)
        const h = 1.006 * t + (x / 1000) * (2501 + 1.86 * t);

        // 6. Dichte (ρ) in kg/m³
        const R_d = 287.058; // Gaskonstante für trockene Luft
        const R_v = 461.52; // Gaskonstante für Wasserdampf
        const T_kelvin = t + 273.15;
        // p_d = Partialdruck trockene Luft, p_v = Partialdruck Wasserdampf
        const p_v = DD * 100; // in Pa
        const p_d = (p * 100) - p_v; // in Pa
        const rho = (p_d / (R_d * T_kelvin)) + (p_v / (R_v * T_kelvin));

        // 7. Spezifisches Volumen in m³/kg
        const v_spec = 1 / rho;
        
        // 8. Feuchtkugeltemperatur (Annäherung, exakte Berechnung ist iterativ)
        // Für die meisten Fälle ist eine Annäherung ausreichend.
        // Eine einfache (aber ungenaue) Annäherung ist der Mittelwert aus Taupunkt und Temperatur.
        // Eine bessere Annäherung verwendet die Enthalpie, ist aber komplex.
        // Hier als Beispiel die einfache Annäherung:
        const Tw = t - ( (100 - rh) / 5 ); // Stütz-Formel als grobe Annäherung

        // --- ERGEBNISSE ANZEIGEN ---
        dewPointValue.textContent = `${Td.toFixed(1)} °C`;
        absHumidityValue.textContent = `${x.toFixed(2)} g/kg`;
        enthalpyValue.textContent = `${h.toFixed(2)} kJ/kg`;
        wetBulbValue.textContent = `${Tw.toFixed(1)} °C`;
        densityValue.textContent = `${rho.toFixed(3)} kg/m³`;
        specificVolumeValue.textContent = `${v_spec.toFixed(3)} m³/kg`;
    }

    // --- MODUS-UMSCHALTUNG ---
    function handleModeChange() {
        if (modeToggle.checked) { // Experten-Modus
            expertViews.forEach(el => el.classList.remove('hidden'));
        } else { // Einfacher Modus
            expertViews.forEach(el => el.classList.add('hidden'));
        }
    }

    // --- EVENT LISTENERS ---
    tempInput.addEventListener('input', calculatePsychrometrics);
    humidityInput.addEventListener('input', calculatePsychrometrics);
    modeToggle.addEventListener('change', handleModeChange);

    // --- ANWENDUNG INITIALISIEREN ---
    calculatePsychrometrics(); // Beim Laden einmal berechnen
    handleModeChange(); // Korrekten Modus beim Laden einstellen
});
