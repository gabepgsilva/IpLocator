document.addEventListener('DOMContentLoaded', function() {
    // --- Particle Canvas ---
    const canvas = document.getElementById('particle-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let particlesArray;

    const mouse = {
        x: null,
        y: null,
        radius: (canvas.height / 120) * (canvas.width / 120)
    };

    window.addEventListener('mousemove', function(event) {
        mouse.x = event.x;
        mouse.y = event.y;
    });

    class Particle {
        constructor(x, y, directionX, directionY, size, color) {
            this.x = x;
            this.y = y;
            this.directionX = directionX;
            this.directionY = directionY;
            this.size = size;
            this.color = color;
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2, false);
            ctx.fillStyle = '#00FF00';
            ctx.fill();
        }
        update() {
            if (this.x > canvas.width || this.x < 0) {
                this.directionX = -this.directionX;
            }
            if (this.y > canvas.height || this.y < 0) {
                this.directionY = -this.directionY;
            }
            this.x += this.directionX;
            this.y += this.directionY;
            this.draw();
        }
    }

    function init() {
        particlesArray = [];
        let numberOfParticles = (canvas.height * canvas.width) / 9000;
        for (let i = 0; i < numberOfParticles; i++) {
            let size = (Math.random() * 2) + 1;
            let x = (Math.random() * ((innerWidth - size * 2) - (size * 2)) + size * 2);
            let y = (Math.random() * ((innerHeight - size * 2) - (size * 2)) + size * 2);
            let directionX = (Math.random() * 2) - 1;
            let directionY = (Math.random() * 2) - 1;
            let color = '#00FF00';
            particlesArray.push(new Particle(x, y, directionX, directionY, size, color));
        }
    }

    function connect() {
        let opacityValue = 1;
        for (let a = 0; a < particlesArray.length; a++) {
            for (let b = a; b < particlesArray.length; b++) {
                let distance = ((particlesArray[a].x - particlesArray[b].x) * (particlesArray[a].x - particlesArray[b].x)) +
                    ((particlesArray[a].y - particlesArray[b].y) * (particlesArray[a].y - particlesArray[b].y));
                if (distance < (canvas.width / 7) * (canvas.height / 7)) {
                    opacityValue = 1 - (distance / 20000);
                    ctx.strokeStyle = `rgba(0, 255, 0, ${opacityValue})`;
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
                    ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
                    ctx.stroke();
                }
            }
        }
    }

    function animate() {
        requestAnimationFrame(animate);
        ctx.clearRect(0, 0, innerWidth, innerHeight);
        for (let i = 0; i < particlesArray.length; i++) {
            particlesArray[i].update();
        }
        connect();
    }
    
    window.addEventListener('resize', function() {
        canvas.width = innerWidth;
        canvas.height = innerHeight;
        mouse.radius = (canvas.height / 120) * (canvas.width / 120);
        init();
    });

    window.addEventListener('mouseout', function() {
        mouse.x = undefined;
        mouse.y = undefined;
    });

    init();
    animate();


    // --- Boot Sequence & Main Logic ---
    const bootScreen = document.getElementById('boot-screen');
    const bootText = document.getElementById('boot-text');
    const mainContainer = document.querySelector('.container');
    const statusPanel = document.getElementById('status-panel');
    const statusText = document.getElementById('status-text');
    const traceForm = document.getElementById('trace-form');
    const targetInput = document.getElementById('target-input');
    const locateSelfBtn = document.getElementById('locate-self-btn');
    const copyBtn = document.getElementById('copy-btn');
    
    let map = null;
    let originCoords = null;
    let traceLine = null;
    let originMarker = null;
    let targetMarker = null;
    let areaCircle = null;

    const bootSequence = [
        { text: 'BOOTING SYSTEM KERNEL...', delay: 250 },
        { text: 'INITIATING PARTICLE FIELD...', delay: 500 },
        { text: 'ESTABLISHING SECURE GEO-LINK...', delay: 400 },
        { text: 'CALIBRATING ORIGIN NODE...', delay: 700 },
        { text: 'AWAITING COMMAND.', delay: 300 }
    ];

    async function runBootSequence() {
        for (const line of bootSequence) {
            bootText.innerHTML += `> ${line.text}\n`;
            await new Promise(resolve => setTimeout(resolve, line.delay));
        }
        bootScreen.style.opacity = '0';
        setTimeout(() => {
            bootScreen.style.display = 'none';
            mainContainer.style.display = 'block';
            runIpLookup(); // Initial lookup for user's own IP
        }, 1000);
    }

    // --- Text Scramble Effect ---
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
                this.queue.push({
                    from,
                    to,
                    start,
                    end
                });
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
                let {
                    from,
                    to,
                    start,
                    end,
                    char
                } = this.queue[i];
                if (this.frame >= end) {
                    complete++;
                    output += to;
                } else if (this.frame >= start) {
                    if (!char || Math.random() < 0.28) {
                        char = this.randomChar();
                        this.queue[i].char = char;
                    }
                    output += `<span class="scrambling">${char}</span>`;
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


    // --- Main Logic ---
    const ipSpan = document.querySelector('#ip-address span');
    const ispSpan = document.querySelector('#isp span');
    const asnSpan = document.querySelector('#asn span');
    const citySpan = document.querySelector('#city span');
    const regionSpan = document.querySelector('#region span');
    const countrySpan = document.querySelector('#country span');
    const zipSpan = document.querySelector('#zip span');
    const timezoneSpan = document.querySelector('#timezone span');
    const latLonSpan = document.querySelector('#lat-lon span');
    
    const scramblers = {
        ip: new TextScramble(ipSpan),
        isp: new TextScramble(ispSpan),
        asn: new TextScramble(asnSpan),
        city: new TextScramble(citySpan),
        region: new TextScramble(regionSpan),
        country: new TextScramble(countrySpan),
        zip: new TextScramble(zipSpan),
        timezone: new TextScramble(timezoneSpan),
        latLon: new TextScramble(latLonSpan)
    };

    let ipAddress = '';

    const phrases = {
        ip: 'Scanning...',
        isp: 'Acquiring ISP...',
        asn: 'Identifying ASN...',
        city: 'Locating City...',
        region: 'Resolving Region...',
        country: 'Resolving Country...',
        zip: 'Pinpointing ZIP...',
        timezone: 'Calculating Timezone...',
        latLon: 'Calibrating Coords...'
    };

    function runIpLookup(target = '') {
        const targetQuery = target ? `/${target}` : '';
        const initialScramble = async () => {
            for (const key in phrases) {
                await scramblers[key].setText(phrases[key]);
            }
        };
        initialScramble();

        fetch(`https://ipapi.co/json${targetQuery}`)
            .then(response => response.json())
            .then(data => {
                if (!data.error) {
                    const targetCoords = [data.latitude, data.longitude];
                    
                    if (!originCoords) {
                        originCoords = [data.latitude, data.longitude];
                    }
                    
                    // Update Status Panel - ipapi.co does not provide proxy/hosting info on the free plan
                    statusPanel.className = 'secure';
                    statusText.textContent = '[STATUS: SECURE]';

                    // Scramble in the data - using ipapi.co field names and adding fallbacks for resilience.
                    scramblers.ip.setText(data.ip || '');
                    scramblers.isp.setText(data.org || ''); // Corrected field from 'isp' to 'org'
                    scramblers.asn.setText(data.asn || '');
                    scramblers.city.setText(data.city || '');
                    scramblers.region.setText(data.region || '');
                    scramblers.country.setText(data.country_name || '');
                    scramblers.zip.setText(data.postal || '');
                    scramblers.timezone.setText(data.timezone || '');
                    scramblers.latLon.setText(`${data.latitude || 'N/A'}, ${data.longitude || 'N/A'}`);

                    if (!map) {
                        map = L.map('map').setView(targetCoords, 10);
                        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                            subdomains: 'abcd',
                            maxZoom: 19
                        }).addTo(map);

                        const originIcon = new L.Icon({
                            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                            iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
                        });
                        originMarker = L.marker(originCoords, {icon: originIcon, zIndexOffset: -100}).addTo(map)
                            .bindPopup(`<b>[ORIGIN NODE]</b>`)
                            .openPopup();
                    } else {
                        map.flyTo(targetCoords, 13);
                    }

                    if (traceLine) traceLine.remove();
                    if (targetMarker) targetMarker.remove();
                    if (areaCircle) areaCircle.remove();

                    traceLine = L.polyline([originCoords, targetCoords], {
                        color: '#00FF00',
                        weight: 3,
                        className: 'trace-route'
                    }).addTo(map);

                    traceLine.on('animationend', () => {
                        traceLine.getElement().classList.add('finished');
                    });

                    areaCircle = L.circle(targetCoords, {
                        radius: 1000, // 1km radius
                        color: '#00FF00',
                        fillColor: '#00FF00',
                        fillOpacity: 0.2,
                        className: 'accuracy-circle'
                    }).addTo(map);

                    const greenIcon = new L.Icon({
                        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                        iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
                        className: 'pulsing-marker'
                    });
                    targetMarker = L.marker(targetCoords, {icon: greenIcon}).addTo(map)
                        .bindPopup(`<b>[TARGET]</b><br>${data.city}, ${data.country_name}`)
                        .openPopup();

                    // Use a longer timeout to ensure all animations complete
                     setTimeout(() => {
                         map.invalidateSize();
                         document.getElementById('map-container').style.opacity = 1;
                     }, 1000);
                } else {
                    statusPanel.className = 'alert';
                    statusText.textContent = `[ERROR: ${data.reason}]`;
                    scramblers.ip.setText('Lookup Failed');
                }
            })
            .catch(error => {
                statusPanel.className = 'alert';
                statusText.textContent = '[ERROR: CONNECTION FAILED]';
                console.error('Error fetching IP data:', error);
                scramblers.ip.setText('Connection Error');
            });
    }

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

    copyBtn.addEventListener('click', function() {
        // Updated to copy all info as a dossier
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
        `;
        navigator.clipboard.writeText(dossier.trim()).then(() => {
            copyBtn.textContent = '[DOSSIER COPIED]';
            setTimeout(() => {
                copyBtn.textContent = '[COPY DOSSIER]';
            }, 2000);
        });
    });
}); 