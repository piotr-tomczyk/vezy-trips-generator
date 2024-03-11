<template>
    <div class="popup-body ezy-theme">
        <div class="form-container">
            <div>
                <span> Airline: </span>
                <select v-model="selectedCallsign">
                    <option v-for="callsign in availableCallsigns" :key="callsign" :value="callsign">
                        {{ callsign }}
                    </option>
                </select>
            </div>
            <div>
            <span> Aircraft: </span>
                <select v-model="selectedAircraft">
                    <option
                        v-if="aircrafts?.length"
                        :value="null">
                    </option>
                    <option v-for="aircraft in aircrafts" :key="aircraft" :value="aircraft">
                        {{ aircraft }}
                    </option>
                </select>
            </div>
            <div>
                <span> Departure: </span>
                <select v-model="selectedDeparture">
                    <option
                        v-if="routes?.length"
                        :value="null">
                    </option>
                    <option v-for="airport in routes" :key="airport.id" :value="airport">
                        {{ airport.icao }} ( {{ airport.name }} )
                    </option>
                </select>
            </div>
            <div v-if="selectedDeparture">
                <span> Destination: </span>
                <select
                    v-model="selectedDestination">
                    <option
                        v-if="routes?.length"
                        :value="null">
                    </option>
                    <option v-for="airport in routes" :key="airport.id" :value="airport">
                        {{ airport.icao }} ( {{ airport.name }} )
                    </option>
                </select>
            </div>
            <div>
                <span> Leg number: </span>
                <select
                    v-model="legNumber">
                    <option v-for="leg in legCountOptions" :key="leg" :value="leg">
                        {{ leg }}
                    </option>
                </select>
            </div>
            <div>
                <span> Hour Limit per leg: </span>
                <select
                    v-model="hoursLimit">
                    <option v-for="hour in hoursLimitOptions" :key="hour" :value="hour">
                        {{ hour > 0 ? hour : 'No limit' }}
                    </option>
                </select>
            </div>
        </div>
        <button
            class="search-button"
            :disabled="isGeneratingRoute"
            @click="calculateLegs">
            Search
        </button>

        <span v-if="isGeneratingRoute">
            Generating Route...
        </span>
        <div v-if="foundTrip">
            <h2>Found Trip</h2>
            <p>
                Aircraft:
                <span class="generated-aircraft-type">
                    {{ generatedAircraftType }}
                </span>
            </p>
            <h2> Route: </h2>
            <table>
                <thead>
                <tr>
                    <th>#</th>
                    <th>Origin</th>
                    <th>Destination</th>
                    <th>Duration</th>
                </tr>
                </thead>
                <tbody>
                <tr v-for="(leg, index) in foundTrip?.legs">
                    <td>{{ index + 1 }}</td>
                    <td>{{ leg.start }}</td>
                    <td>{{ leg.end }}</td>
                    <td>
                        {{ allRoutes?.find((route) => route.icao === leg.start)?.destinations?.find((destination) => destination.icao === leg.end)?.time }}
                    </td>
                </tr>
                <tr>
                    <td v-if="!totalTripTime?.includes('NaN') && !totalTurnaroundTime?.includes('NaN')" colspan="4">
                        Total trip time: <span style="font-weight: bold"> {{ totalTripTime }} </span> (includes {{ totalTurnaroundTime }} of turnaroud)
                    </td>
                </tr>
                </tbody>
            </table>
        </div>
        <div class="error-message" v-else-if="generatedAircraftType || isError">
            <span v-if="routes?.length === 0">
                No possible trip found for selected parameters. Try changing parameters.
            </span>
            <span v-else-if="generatedAircraftType">
                No trip found for generated aircraft:
                {{ generatedAircraftType }}  and {{generatedDeparture}} departure airport,
                it might take a few attempts. Try changing parameters or search again.
            </span>
            <span v-else>
                No trip found for selected parameters. Try changing parameters or search again.
            </span>
        </div>
    </div>
</template>

<script setup lang="ts">
    import { ref, computed, watch, onMounted } from 'vue';

    import easyData from './static/easy.json';
    import easyAircrafts from './static/easyAircrafts.json';

    import type { Trip, Route } from './types/types';
    import { TripService } from './services/trip-service';
    import { FilterUtils } from './utils/filters';

    const aircrafts = computed<string[]>(() => {
        //@ts-ignore
        return selectedCallsign.value ? easyAircrafts[selectedCallsign.value] : easyAircrafts['EZY'];
    });

    const allRoutes = computed(() => easyData.routes.sort((a, b) => FilterUtils.sortAlphabetically(a.icao, b.icao)));

    const routes = computed(() => {
        const routeFilteredByCallsing = selectedCallsign.value
            //@ts-ignore
            ? FilterUtils.filterDataByCallsign(allRoutes.value, selectedCallsign.value)
            : allRoutes.value;

        const routeFilteredByHours = hoursLimit.value !== 0
            ? FilterUtils.filterDataByHours(routeFilteredByCallsing, hoursLimit.value)
            : routeFilteredByCallsing;

        const routesFilteredByAircraft = selectedAircraft.value
            ? FilterUtils.filterDataByAircraft(routeFilteredByHours, selectedAircraft.value)
            : routeFilteredByHours;

        return routesFilteredByAircraft;
    });

    const totalTripTime = computed<string>(() => {
        if (foundTrip.value) {
            const tripTimeInSeconds = foundTrip.value.legs.reduce((currentValue, leg) => {
                const legTime = allRoutes.value?.find((route) => route.icao === leg.start)?.destinations?.find((destination) => destination.icao === leg.end)?.time || '';
                const [hours, minutes, seconds] = legTime.split(':').map(Number);
                return hours * 3600 + minutes * 60 + seconds + currentValue;
            }, 0);

            const tripAndTournaroundTime = tripTimeInSeconds + totalTurnaroundTimeInSeconds.value;

            const hours = Math.floor(tripAndTournaroundTime / 3600);
            const minutes = Math.floor((tripAndTournaroundTime % 3600) / 60);
            const seconds = tripAndTournaroundTime % 60;

            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return '';
    });

    const totalTurnaroundTimeInSeconds = computed<number>(() => foundTrip.value ? (foundTrip.value.legs.length - 1) * 35 * 60 : 0);

    const totalTurnaroundTime = computed(() => {
        if (foundTrip.value) {
            const hours = Math.floor(totalTurnaroundTimeInSeconds.value / 3600);
            const minutes = Math.floor((totalTurnaroundTimeInSeconds.value % 3600) / 60);
            const seconds = totalTurnaroundTimeInSeconds.value % 60;

            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    })

    //@ts-ignore
    const availableCallsigns = computed(() => FilterUtils.getAllCallsigns(allRoutes.value));

    const selectedCallsign = ref<string | null>(null);

    const selectedDeparture = ref<Route | null>(null);
    const selectedDestination = ref<Route | null>(null);

    const selectedAircraft = ref<string | null>(null);

    const legCountOptions = ref([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 20, 30, 50, 100]);
    const legNumber = ref(2);

    const hoursLimit = ref(0);
    const hoursLimitOptions = ref([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

    const searchModes = ref(['Legs', 'Trips']);
    const selectedSearchMode = ref('Trips');

    const foundTrip = ref<Trip | null>(null);
    const generatedAircraftType = ref<string | null>(null);
    const generatedDeparture = ref<string | null>(null);

    const isGeneratingRoute = ref(false);

    const isError = ref(false);

    watch(selectedCallsign, () => {
        selectedDeparture.value = null;
        selectedDestination.value = null;
        selectedAircraft.value = null;

        if (selectedCallsign.value) {
            const tripData = localStorage.getItem(selectedCallsign.value);
            if (tripData) {
                const parsedResult = JSON.parse(tripData);
                foundTrip.value = parsedResult?.trip ?? null;
                generatedAircraftType.value = parsedResult?.aircraftType ?? null;
            } else {
                foundTrip.value = null;
                generatedAircraftType.value = null;
            }
            localStorage.setItem('lastVisited', selectedCallsign.value);
        } else {
            foundTrip.value = null;
            generatedAircraftType.value = null;
        }
    });

    watch(selectedAircraft, () => {
        selectedDeparture.value = null;
        selectedDestination.value = null;
    });

    onMounted(() => {
        const lastVisitedCallsign = localStorage.getItem('lastVisited');
        if (lastVisitedCallsign) {
            selectedCallsign.value = lastVisitedCallsign;
            const tripData = localStorage.getItem(selectedCallsign.value);
            if (tripData) {
                const parsedResult = JSON.parse(tripData);
                foundTrip.value = parsedResult?.trip ?? null;
                generatedAircraftType.value = parsedResult?.aircraftType ?? null;
            } else {
                foundTrip.value = null;
                generatedAircraftType.value = null;
            }
        } else {
            selectedCallsign.value = availableCallsigns.value[0];
            foundTrip.value = null;
            generatedAircraftType.value = null;
        }
    });

    function calculateLegs() {
        if (isGeneratingRoute.value) {
            return;
        }

        isError.value = false;

        switch (selectedSearchMode.value) {
            case 'Legs':
                console.log('Legs');
                break;
            case 'Trips':
                const isSelectedAircraft = !!selectedAircraft.value;
                selectedAircraft.value ??=  getRandomAircraft();
                const startAirport = selectedDeparture.value?.icao ?? getRandomDepartureAirport()?.icao;
                const destinationAirport = selectedDestination.value?.icao ?? startAirport;
                const desiredHours = hoursLimit.value;
                const desiredLegs = legNumber.value;

                generatedAircraftType.value = null;
                foundTrip.value = null;
                try {
                    isGeneratingRoute.value = true;
                    let tripsData;
                    const tripService = new TripService();
                    for (let i = 0; i < 50; i++) {
                        const departureAirport = i == 0 ? startAirport : getRandomDepartureAirport()?.icao;
                        tripsData = tripService.findTrip(
                            // @ts-ignore
                            routes.value,
                            departureAirport,
                            destinationAirport,
                            desiredLegs + 1,
                            selectedAircraft.value || undefined,
                            desiredHours
                        );

                        if ((tripsData.trip) || selectedDeparture.value?.icao) {
                            break;
                        }
                    }

                    if (tripsData?.trip && selectedCallsign.value) {
                        localStorage.setItem(selectedCallsign.value, JSON.stringify(tripsData));
                    }

                    foundTrip.value = tripsData?.trip ?? null;
                    generatedAircraftType.value = tripsData?.aircraftType ?? null;
                    generatedDeparture.value = destinationAirport;
                } catch (error) {
                    isError.value = true;
                    console.log({ error });
                } finally {
                    if (!isSelectedAircraft) {
                        selectedAircraft.value = null;
                    }
                    isGeneratingRoute.value = false;
                }
                break;
            default:
                console.log('Default');
        }
    }

    function getRandomDepartureAirport() {
        return routes.value[Math.floor(Math.random() * routes.value?.length)];
    }

    function getRandomAircraft() {
        const aircraftsToProcess = selectedDeparture.value
            ? selectedDeparture.value?.aircrafts.filter(
            (aircraft) => aircrafts.value.find((aircraftType) => aircraftType === aircraft))
            : aircrafts.value;
        return aircraftsToProcess?.[Math.floor(Math.random() * aircraftsToProcess?.length)];
    }
</script>

<style scoped>
    .popup-body {
        width: 400px;
        padding: 30px;
        font-family: Arial, sans-serif;
        box-sizing: border-box;
        font-size: 12px;
        margin: 20px;
    }
    @media (min-width: 600px) {
        .popup-body {
            border-radius: 5px;
        }

        .ezy-theme {
            border: 1px solid #666666;
        }
    }

    .form-container {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-bottom: 20px;
    }

    .form-container > div > span {
        font-weight: bold;
        margin-bottom: 5px;
        font-size: 12px;
    }

    .form-container > select {
        padding: 8px;
        border: 1px solid #ccc;
        border-radius: 4px;
    }

    .form-container > div {
        display: flex;
        flex-direction: column;
    }

    button {
        background-color: #007bff;
        color: white;
        padding: 10px 20px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.3s ease;
    }

    button:hover {
        background-color: #0056b3;
    }

    button:active {
        background-color: #00428a;
    }

    button:disabled {
        opacity: 0.6;
        cursor: default;
    }

    table {
        width: 100%;
        border-collapse: collapse;
    }

    th, td {
        border: 1px solid #ddd;
        padding: 8px;
    }

    th {
        text-align: left;
        background-color: #f2f2f2;
    }

    h2 {
        font-size: 1.2em;
        margin-bottom: 10px;
    }

    .generated-aircraft-type {
        font-weight: bold;
    }

    .error-message {
        color: #d9534f;
        background-color: #ffe0e0;
        border: 1px solid #d43f3a;
        padding: 10px;
        margin: 15px 0;
        max-width: 380px;
        word-wrap: break-word;
    }

    .ezy-theme {
        background-color: #F9F9FC;
        color: #000;
    }

    .ezy-theme table th {
        background-color: #FE6600;
        color: white;
        border: 1px solid black;
        padding: 8px;
    }

    .ezy-theme table td {
        background-color: white;
        color: black;
        border: 1px solid black;
        padding: 8px;
    }

    .ezy-theme table tr:hover td {
        background-color: #FDF2E9;
    }

    .ezy-theme .search-button {
        background-color: #FE6600;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 10px 20px;
        cursor: pointer;
        transition: background-color 0.3s ease;
    }

    .ezy-theme .search-button:hover {
        background-color: #2B2B2B;
        color: white;
    }

    .ezy-theme .search-button:active {
        background-color: #2B2B2B; /* Keep the hover color */
        color: white;
        transform: scale(0.98); /* Slightly shrink the button */
    }

    .ezy-theme .search-button:disabled {
        background-color: #D1D1D1;
        color: #8C8C8C;
        opacity: 0.6;
        cursor: default;
    }
</style>
