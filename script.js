const API_URL = 'https://api.open-meteo.com/v1/forecast?latitude=-6.2&longitude=106.8&hourly=temperature_2m,relativehumidity_2m,windspeed_10m,weathercode';

// Global variables untuk menyimpan data
let weatherData = null;
let dailyDataList = null;
let selectedDateIndex = 0;

// Fungsi untuk update jam saat ini dan ringkasan cuaca
function updateCurrentTimeAndWeather() {
    const now = new Date();
    const currentTimeDisplay = document.getElementById('currentTimeDisplay');
    const currentWeatherSummary = document.getElementById('currentWeatherSummary');
    
    if (currentTimeDisplay) {
        const formattedTime = now.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        currentTimeDisplay.textContent = formattedTime + ' WIB';
    }
    
    // Tampilkan ringkasan cuaca saat ini jika data sudah ada
    if (currentWeatherSummary && weatherData && weatherData.hourly) {
        const now = new Date();
        now.setMinutes(0, 0, 0);
        
        const times = weatherData.hourly.time;
        const temperatures = weatherData.hourly.temperature_2m;
        const humidity = weatherData.hourly.relativehumidity_2m || [];
        const windspeed = weatherData.hourly.windspeed_10m || [];
        const weathercode = weatherData.hourly.weathercode || [];
        
        // Cari data yang sesuai dengan jam sekarang
        let currentIndex = -1;
        times.forEach((time, index) => {
            const dataTime = new Date(time);
            if (dataTime.getFullYear() === now.getFullYear() &&
                dataTime.getMonth() === now.getMonth() &&
                dataTime.getDate() === now.getDate() &&
                dataTime.getHours() === now.getHours()) {
                currentIndex = index;
            }
        });
        
        if (currentIndex === -1) {
            times.forEach((time, index) => {
                const dataTime = new Date(time);
                if (dataTime >= now && currentIndex === -1) {
                    currentIndex = index;
                }
            });
        }
        
        if (currentIndex >= 0) {
            const icon = getWeatherIcon(weathercode[currentIndex] || 0);
            const condition = getWeatherCondition(weathercode[currentIndex] || 0);
            const temp = temperatures[currentIndex].toFixed(0);
            const hum = humidity[currentIndex] || 0;
            const wind = windspeed[currentIndex] || 0;
            
            currentWeatherSummary.innerHTML = `
                <div class="summary-icon">${icon}</div>
                <div class="summary-temp">${temp}°C</div>
                <div class="summary-condition">${condition}</div>
                <div class="summary-details">
                    <span>Kelembapan: ${hum}%</span>
                    <span>Kecepatan Angin: ${wind.toFixed(1)} km/h</span>
                </div>
            `;
        }
    }
}

// Fungsi untuk mendapatkan icon cuaca berdasarkan weathercode
function getWeatherIcon(weathercode) {
    // Simplified weather icon mapping based on WMO Weather interpretation codes
    if (weathercode === 0) return '☀️'; // Clear sky
    if (weathercode <= 3) return '⛅'; // Partly cloudy
    if (weathercode <= 48) return '☁️'; // Cloudy
    if (weathercode <= 57) return '🌧️'; // Drizzle/Rain
    if (weathercode <= 67) return '🌧️'; // Rain
    if (weathercode <= 77) return '❄️'; // Snow
    if (weathercode <= 82) return '🌦️'; // Rain showers
    if (weathercode <= 86) return '❄️'; // Snow showers
    if (weathercode <= 99) return '⛈️'; // Thunderstorm
    return '☁️';
}

// Fungsi untuk mendapatkan kondisi cuaca dalam bahasa Indonesia
function getWeatherCondition(weathercode) {
    if (weathercode === 0) return 'Cerah';
    if (weathercode === 1 || weathercode === 2) return 'Cerah Berawan';
    if (weathercode === 3) return 'Berawan';
    if (weathercode >= 45 && weathercode <= 48) return 'Berkabut';
    if (weathercode >= 51 && weathercode <= 57) return 'Hujan Ringan';
    if (weathercode >= 61 && weathercode <= 67) return 'Hujan';
    if (weathercode >= 71 && weathercode <= 77) return 'Salju';
    if (weathercode >= 80 && weathercode <= 82) return 'Hujan Ringan';
    if (weathercode >= 85 && weathercode <= 86) return 'Salju';
    if (weathercode >= 95 && weathercode <= 99) return 'Hujan Petir';
    return 'Berawan';
}

// Fungsi untuk mendapatkan data harian dari data hourly
function getDailyData(hourlyData) {
    const dailyMap = new Map();
    
    hourlyData.time.forEach((time, index) => {
        const date = new Date(time);
        const dateKey = date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
        
        if (!dailyMap.has(dateKey)) {
            dailyMap.set(dateKey, {
                date: dateKey,
                temps: [],
                humidity: [],
                weathercode: hourlyData.weathercode[index],
                fullDate: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
                startIndex: index
            });
        }
        
        const dayData = dailyMap.get(dateKey);
        dayData.temps.push(hourlyData.temperature_2m[index]);
        dayData.humidity.push(hourlyData.relativehumidity_2m[index]);
    });
    
    return Array.from(dailyMap.values()).map(day => ({
        ...day,
        avgTemp: Math.round(day.temps.reduce((a, b) => a + b, 0) / day.temps.length),
        avgHumidity: Math.round(day.humidity.reduce((a, b) => a + b, 0) / day.humidity.length),
        hourCount: day.temps.length
    }));
}

// Fungsi untuk menampilkan hourly list berdasarkan tanggal yang dipilih
function displayHourlyForDate(dateIndex, dailyData) {
    const hourlyList = document.getElementById('hourlyList');
    hourlyList.innerHTML = '';
    
    if (!weatherData || !dailyData[dateIndex]) {
        return;
    }
    
    const selectedDay = dailyData[dateIndex];
    const times = weatherData.hourly.time;
    const temperatures = weatherData.hourly.temperature_2m;
    const humidity = weatherData.hourly.relativehumidity_2m || [];
    const windspeed = weatherData.hourly.windspeed_10m || [];
    const weathercode = weatherData.hourly.weathercode || [];
    
    // Tentukan startIndex dan endIndex
    let startIndex = selectedDay.startIndex;
    let endIndex = Math.min(startIndex + 24, times.length);
    
    // Jika ini hari ini (index 0), mulai dari jam sekarang hingga 23.00
    if (dateIndex === 0) {
        const now = new Date();
        now.setMinutes(0, 0, 0); // Set ke awal jam
        
        // Cari index yang sesuai dengan jam sekarang dalam rentang hari ini
        let currentHourIndex = -1;
        for (let i = selectedDay.startIndex; i < Math.min(selectedDay.startIndex + 24, times.length); i++) {
            const dataTime = new Date(times[i]);
            if (dataTime.getFullYear() === now.getFullYear() &&
                dataTime.getMonth() === now.getMonth() &&
                dataTime.getDate() === now.getDate() &&
                dataTime.getHours() === now.getHours()) {
                currentHourIndex = i;
                break;
            }
        }
        
        // Jika tidak ditemukan jam sekarang, cari yang paling dekat (jam berikutnya)
        if (currentHourIndex === -1) {
            for (let i = selectedDay.startIndex; i < Math.min(selectedDay.startIndex + 24, times.length); i++) {
                const dataTime = new Date(times[i]);
                if (dataTime >= now) {
                    currentHourIndex = i;
                    break;
                }
            }
        }
        
        // Jika ditemukan, mulai dari jam sekarang
        if (currentHourIndex >= 0) {
            startIndex = currentHourIndex;
        }
        
        // Untuk hari ini, hanya tampilkan hingga 23.00 hari ini
        // Cari index untuk jam 23:00 hari ini (entry terakhir hari ini sebelum jam 00:00 esok)
        const todayDate = now.getDate();
        const todayMonth = now.getMonth();
        const todayYear = now.getFullYear();
        
        // Set endIndex ke 24 jam pertama sebagai default
        endIndex = Math.min(selectedDay.startIndex + 24, times.length);
        
        // Cari entry terakhir yang masih hari ini (hingga jam 23:00)
        for (let i = selectedDay.startIndex; i < Math.min(selectedDay.startIndex + 24, times.length); i++) {
            const dataTime = new Date(times[i]);
            const dataDate = dataTime.getDate();
            const dataMonth = dataTime.getMonth();
            const dataYear = dataTime.getFullYear();
            const dataHour = dataTime.getHours();
            
            // Jika sudah masuk hari berikutnya, atau sudah jam 00:00 esok hari
            if ((dataDate !== todayDate || dataMonth !== todayMonth || dataYear !== todayYear) || 
                (dataDate === todayDate && dataHour === 0 && i > startIndex)) {
                endIndex = i;
                break;
            }
        }
    }
    
    for (let i = startIndex; i < endIndex; i++) {
        const entry = document.createElement('div');
        const dateTime = new Date(times[i]);
        
        entry.className = 'hourly-entry';
        
        const timeStr = dateTime.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }) + ' WIB';
        
        const icon = getWeatherIcon(weathercode[i] || 0);
        const condition = getWeatherCondition(weathercode[i] || 0);
        const temp = temperatures[i].toFixed(0);
        const hum = humidity[i] || 0;
        const wind = windspeed[i] || 0;
        
        entry.innerHTML = `
            <div class="hourly-time">${timeStr}</div>
            <div class="hourly-weather">
                <span class="hourly-icon">${icon}</span>
                <span class="hourly-temp">${temp}°C</span>
                <span class="hourly-condition">${condition}</span>
            </div>
            <div class="hourly-humidity">${hum}%</div>
            <div class="hourly-wind">${wind.toFixed(1)} km/h</div>
        `;
        
        hourlyList.appendChild(entry);
    }
}

async function fetchWeatherData() {
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const currentLocation = document.getElementById('currentLocation');
    const dailyForecast = document.getElementById('dailyForecast');
    const dailyCards = document.getElementById('dailyCards');
    const mainContent = document.getElementById('mainContent');
    const hourlyList = document.getElementById('hourlyList');
    
    try {
        loading.style.display = 'block';
        error.style.display = 'none';
        currentLocation.style.display = 'none';
        dailyForecast.style.display = 'none';
        mainContent.style.display = 'none';
        
        console.log('Mengambil data dari:', API_URL);
        const response = await fetch(API_URL);
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Data diterima:', data);
        
        // Simpan data secara global
        weatherData = data;
        
        if (data.hourly && data.hourly.time && data.hourly.temperature_2m) {
            // Buat daily forecast cards (11 hari: hari ini + 10 hari berikutnya)
            const dailyData = getDailyData(data.hourly);
            dailyDataList = dailyData.slice(0, 11); // Simpan secara global
            dailyCards.innerHTML = '';
            
            // Set selectedDateIndex ke 0 (hari ini) saat awal
            selectedDateIndex = 0;
            
            dailyDataList.forEach((day, index) => {
                const card = document.createElement('div');
                card.className = index === 0 ? 'daily-card today active' : 'daily-card';
                card.dataset.dateIndex = index;
                card.style.cursor = 'pointer';
                
                const dayName = index === 0 ? 'Hari Ini' : 
                               index === 1 ? 'Besok' :
                               day.fullDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' });
                
                card.innerHTML = `
                    <div class="daily-card-icon">${getWeatherIcon(day.weathercode)}</div>
                    <div class="daily-card-day">${dayName}</div>
                    <div class="daily-card-temp">${day.avgTemp}°</div>
                    <div class="daily-card-humidity">${day.avgHumidity}%</div>
                `;
                
                // Event listener untuk klik card
                card.addEventListener('click', () => {
                    // Hapus active dari semua cards
                    document.querySelectorAll('.daily-card').forEach(c => {
                        c.classList.remove('active');
                    });
                    
                    // Tambahkan active ke card yang diklik
                    card.classList.add('active');
                    
                    // Update selectedDateIndex
                    selectedDateIndex = index;
                    
                    // Tampilkan hourly data untuk tanggal yang dipilih
                    displayHourlyForDate(index, dailyDataList);
                });
                
                dailyCards.appendChild(card);
            });
            dailyForecast.style.display = 'block';
            
            // Tampilkan current location dan update jam
            updateCurrentTimeAndWeather();
            currentLocation.style.display = 'block';
            
            // Update jam setiap detik
            setInterval(updateCurrentTimeAndWeather, 1000);
            
            // Tampilkan hourly list untuk hari ini (index 0) saat awal
            displayHourlyForDate(0, dailyDataList);
            
            mainContent.style.display = 'block';
        } else {
            throw new Error('Data format tidak valid');
        }
        
        loading.style.display = 'none';
        
    } catch (err) {
        loading.style.display = 'none';
        error.style.display = 'block';
        error.textContent = `Error: ${err.message}. Silakan coba lagi nanti.`;
        console.error('Error fetching weather data:', err);
    }
}

// Dark mode toggle functionality
function initThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    const html = document.documentElement;
    
    // Load saved theme preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        html.classList.add('dark-mode');
        themeToggle.checked = true;
    } else {
        html.classList.remove('dark-mode');
        themeToggle.checked = false;
    }
    
    // Toggle theme on change
    themeToggle.addEventListener('change', () => {
        if (themeToggle.checked) {
            html.classList.add('dark-mode');
            localStorage.setItem('theme', 'dark');
        } else {
            html.classList.remove('dark-mode');
            localStorage.setItem('theme', 'light');
        }
    });
}

// Tab navigation
document.addEventListener('DOMContentLoaded', () => {
    initThemeToggle();
    fetchWeatherData();
    
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            // Tab switching logic bisa ditambahkan di sini
        });
    });
});
