document.addEventListener('DOMContentLoaded', () => {
    // --- TextScramble Class ---
    class TextScramble {
        constructor(el) {
            this.el = el;
            this.chars = '!<>-_\\/[]{}—=+*^?#________';
            this.update = this.update.bind(this);
        }
        setText(newText) {
            const oldText = this.el.innerText;
            const length = Math.max(oldText.length, newText.length);
            const promise = new Promise((resolve) => this.resolve = resolve);
            this.queue = [];
            for (let i = 0; i < length; i++) {
                const from = oldText[i] || '';
                const to = newText[i] || '';
                const start = Math.floor(Math.random() * 40);
                const end = start + Math.floor(Math.random() * 40);
                this.queue.push({ from, to, start, end });
            }
            cancelAnimationFrame(this.frameRequest);
            this.frame = 0;
            this.update();
            return promise;
        }
        update() {
            let output = '';
            let complete = 0;
            for (let i = 0, n = this.queue.length; i < n; i++) {
                let { from, to, start, end, char } = this.queue[i];
                if (this.frame >= end) {
                    complete++;
                    output += to;
                } else if (this.frame >= start) {
                    if (!char || Math.random() < 0.28) {
                        char = this.randomChar();
                        this.queue[i].char = char;
                    }
                    output += `<span class="dud">${char}</span>`;
                } else {
                    output += from;
                }
            }
            this.el.innerHTML = output;
            if (complete === this.queue.length) {
                this.resolve();
            } else {
                this.frameRequest = requestAnimationFrame(this.update);
                this.frame++;
            }
        }
        randomChar() {
            return this.chars[Math.floor(Math.random() * this.chars.length)];
        }
    }

    // --- DOM Elements ---
    const traceForm = document.getElementById('trace-form');
    const targetInput = document.getElementById('target-input');
    const locateSelfBtn = document.getElementById('locate-self-btn');
    const copyBtn = document.getElementById('copy-btn');
    const statusPanel = document.getElementById('status-panel');
    const statusText = document.getElementById('status-text');

    // --- Scramble Elements ---
    const scramblers = {
        ip: new TextScramble(document.querySelector('#ip-address span')),
        isp: new TextScramble(document.querySelector('#isp span')),
        asn: new TextScramble(document.querySelector('#asn span')),
        city: new TextScramble(document.querySelector('#city span')),
        region: new TextScramble(document.querySelector('#region span')),
        country: new TextScramble(document.querySelector('#country span')),
        zip: new TextScramble(document.querySelector('#zip span')),
        timezone: new TextScramble(document.querySelector('#timezone span')),
        latLon: new TextScramble(document.querySelector('#lat-lon span'))
    };

    // --- Map Variables ---
    let map = null;
    let originCoords = null;
    let targetMarker = null;
    let traceLine = null;

    const greenIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    // --- Main Functions ---
    const initialIpLookup = async () => {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            if (!response.ok) throw new Error('Failed to fetch IPv4');
            const data = await response.json();
            runIpLookup(data.ip);
        } catch (error) {
            console.error("Could not fetch IPv4, falling back to default.", error);
            runIpLookup();
        }
    };

    function runIpLookup(target = '') {
        const targetQuery = target ? `/${target}` : '';
        const initialScramble = () => {
             const phrases = {
                ip: '...', isp: '...', asn: '...', city: '...',
                region: '...', country: '...', zip: '...',
                timezone: '...', latLon: '...'
            };
            for (const key in phrases) {
                scramblers[key].setText(phrases[key]);
            }
        };
        initialScramble();

        fetch(`/api/lookup${targetQuery}`)
            .then(response => {
                if (!response.ok) throw new Error(`Network response was not ok: ${response.statusText}`);
                return response.json();
            })
            .then(data => {
                if (data.bogon) throw new Error('Private or invalid IP address.');
                if (!data.loc) throw new Error('Location data not found.');

                const [latitude, longitude] = data.loc.split(',').map(Number);
                const targetCoords = [latitude, longitude];

                if (!originCoords) {
                    originCoords = [...targetCoords];
                }

                const isSecure = !(data.privacy?.vpn || data.privacy?.proxy || data.privacy?.hosting);
                statusPanel.className = isSecure ? 'secure' : 'insecure';
                statusText.textContent = isSecure ? '[STATUS: SECURE]' : '[STATUS: COMPROMISED]';

                scramblers.ip.setText(data.ip || 'N/A');
                scramblers.isp.setText(data.org || 'N/A');
                scramblers.asn.setText(data.asn?.asn || 'N/A');
                scramblers.city.setText(data.city || 'N/A');
                scramblers.region.setText(data.region || 'N/A');
                scramblers.country.setText(data.country || 'N/A');
                scramblers.zip.setText(data.postal || 'N/A');
                scramblers.timezone.setText(data.timezone || 'N/A');
                scramblers.latLon.setText(data.loc || 'N/A');

                if (!map) {
                    map = L.map('map').setView(targetCoords, 13);
                    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                        attribution: '&copy; CARTO',
                        subdomains: 'abcd',
                        maxZoom: 19
                    }).addTo(map);
                }
                map.flyTo(targetCoords, 13);

                if (targetMarker) {
                    targetMarker.setLatLng(targetCoords);
                } else {
                    targetMarker = L.marker(targetCoords, { icon: greenIcon }).addTo(map);
                }
                targetMarker.bindPopup(`<b>TARGET:</b> ${data.ip}`).openPopup();

                if (traceLine) map.removeLayer(traceLine);
                traceLine = L.polyline([originCoords, targetCoords], {
                    color: '#00ff00',
                    weight: 2,
                    className: 'trace-line'
                }).addTo(map);
            })
            .catch(error => {
                console.error("Error fetching IP data:", error);
                statusPanel.className = 'alert';
                statusText.textContent = `[ERROR: ${error.message}]`;
                scramblers.ip.setText('Lookup Failed');
            });
    }

    // --- Event Listeners ---
    traceForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const target = targetInput.value.trim();
        if (target) runIpLookup(target);
    });

    locateSelfBtn.addEventListener('click', () => {
        initialIpLookup();
    });

    copyBtn.addEventListener('click', () => {
        const dossier = `
        [IP ANALYSIS DOSSIER]
        STATUS: ${statusText.textContent}
        ---------------------------------
        TARGET: ${document.querySelector('#ip-address span').textContent}
        ISP: ${document.querySelector('#isp span').textContent}
        ASN: ${document.querySelector('#asn span').textContent}
        CITY: ${document.querySelector('#city span').textContent}
        REGION: ${document.querySelector('#region span').textContent}
        COUNTRY: ${document.querySelector('#country span').textContent}
        ZIP: ${document.querySelector('#zip span').textContent}
        TIMEZONE: ${document.querySelector('#timezone span').textContent}
        COORDS: ${document.querySelector('#lat-lon span').textContent}
        `.trim().replace(/^\s+/gm, '');
        navigator.clipboard.writeText(dossier).then(() => {
            copyBtn.textContent = '[DOSSIER COPIED]';
            setTimeout(() => copyBtn.textContent = '[COPY DOSSIER]', 2000);
        });
    });

    // --- Initial Run ---
    initialIpLookup();
});
