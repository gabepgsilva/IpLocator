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

    // DOM Elements
    const traceForm = document.getElementById('trace-form');
    const targetInput = document.getElementById('target-ip');
    const locateSelfBtn = document.getElementById('locate-self');
    const statusPanel = document.getElementById('status-panel');
    const statusText = document.getElementById('status-text');

    // Scramble Elements
    const scramblers = {
        ip: new TextScramble(document.getElementById('ip-val')),
        isp: new TextScramble(document.getElementById('isp-val')),
        asn: new TextScramble(document.getElementById('asn-val')),
        city: new TextScramble(document.getElementById('city-val')),
        region: new TextScramble(document.getElementById('region-val')),
        country: new TextScramble(document.getElementById('country-val')),
        zip: new TextScramble(document.getElementById('zip-val')),
        timezone: new TextScramble(document.getElementById('timezone-val')),
        latLon: new TextScramble(document.getElementById('latlon-val'))
    };
    
    // Map variables
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

    const runBootSequence = () => {
        const bootText = [
            'BOOTING...',
            'INITIALIZING INTERFACE...',
            'CONNECTING TO SATELLITE...',
            'ESTABLISHING CONNECTION...',
            'TRACING IP...'
        ];
        let line = 0;
        const terminal = document.getElementById('terminal-output');
        const interval = setInterval(() => {
            if (line < bootText.length) {
                terminal.innerHTML += `${bootText[line]}<br>`;
                line++;
            } else {
                clearInterval(interval);
            }
        }, 200);

        setTimeout(async () => {
            try {
                // We will first attempt to get the user's public IPv4 address.
                const response = await fetch('https://api.ipify.org?format=json');
                if (!response.ok) {
                    throw new Error(`ipify request failed: ${response.status}`);
                }
                const data = await response.json();
                // If successful, we use that IPv4 for the main lookup.
                runIpLookup(data.ip);
            } catch (error) {
                console.error("Could not fetch IPv4 address. Falling back to default IP.", error);
                // If we can't get the IPv4, we fall back to the default lookup,
                // which will use the IP seen by Cloudflare (v4 or v6).
                runIpLookup();
            }
        }, 1000);
    };

    function runIpLookup(target = '') {
        const targetQuery = target ? `/${target}` : '';
        const initialScramble = async () => {
            const phrases = {
                ip: '??? . ??? . ??? . ???',
                isp: '???????? ???',
                asn: '?????',
                city: '??????',
                region: '??????',
                country: '?????',
                zip: '?????',
                timezone: '?????/?????',
                latLon: '??.?????, ??.?????'
            };
            for (const key in phrases) {
                await scramblers[key].setText(phrases[key]);
            }
        };
        initialScramble();

        fetch(`/api/lookup${targetQuery}`)
            .then(response => response.json())
            .then(data => {
                if (data.bogon) {
                    throw new Error('Private or invalid IP address.');
                }
                if (!data.loc) {
                    throw new Error('Location data not found in response.');
                }
                
                const [latitude, longitude] = data.loc.split(',').map(Number);
                const targetCoords = [latitude, longitude];
                
                if (!originCoords) {
                    originCoords = [latitude, longitude];
                }
                
                const isSecure = !(data.privacy?.vpn || data.privacy?.proxy || data.privacy?.hosting);
                statusPanel.className = isSecure ? 'secure' : 'insecure';
                statusText.textContent = isSecure ? '[STATUS: SECURE]' : '[STATUS: INSECURE]';

                scramblers.ip.setText(data.ip || '');
                scramblers.isp.setText(data.org || '');
                scramblers.asn.setText(data.asn?.asn || '');
                scramblers.city.setText(data.city || '');
                scramblers.region.setText(data.region || '');
                scramblers.country.setText(data.country || '');
                scramblers.zip.setText(data.postal || '');
                scramblers.timezone.setText(data.timezone || '');
                scramblers.latLon.setText(data.loc || 'N/A');

                if (!map) {
                    map = L.map('map-container', {
                        center: targetCoords,
                        zoom: 13,
                        zoomControl: false,
                        attributionControl: false
                    });
                    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
                        subdomains: 'abcd',
                        maxZoom: 19
                    }).addTo(map);

                    setTimeout(() => {
                        map.invalidateSize();
                        document.getElementById('map-container').style.opacity = 1;
                    }, 3000); 
                }
                
                map.flyTo(targetCoords, 13);
                
                if (targetMarker) {
                    targetMarker.setLatLng(targetCoords);
                } else {
                    targetMarker = L.marker(targetCoords, {icon: greenIcon}).addTo(map);
                }
                targetMarker.bindPopup(`<b>[TARGET]</b><br>${data.city}, ${data.country}`).openPopup();
                
                if (traceLine) {
                    map.removeLayer(traceLine);
                }
                
                traceLine = L.polyline([originCoords, targetCoords], {
                    color: '#00ff00',
                    weight: 2,
                    opacity: 0.7,
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
    runBootSequence();

    traceForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const target = targetInput.value;
        if (target) {
            runIpLookup(target);
        }
    });

    locateSelfBtn.addEventListener('click', function() {
        runIpLookup();
    });
}); 