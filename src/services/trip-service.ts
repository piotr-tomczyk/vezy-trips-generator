import { Route, Trip, Airport } from '../types/types';
import { FilterUtils } from '../utils/filters';

export class TripService {
    constructor() {
    }

    public findTrip(
        airportsToProcess: Route[],
        startAirport: string,
        destinationAirport: string,
        desiredLegs: number,
        aircraftType: string = '',
        maxLegTime: number // Time in hours
    ): { trip: Trip | null, aircraftType: string, callsign?: string | null } {
        const airports = this.processData(airportsToProcess);
        if (maxLegTime === 0) {
            maxLegTime = Infinity;
        }

        let foundTrip: Trip | null = null;

        function dfs(startAirport: string, currentTrip: string[]) {
            currentTrip.push(startAirport);

            if (startAirport === destinationAirport && currentTrip.length > 1 && currentTrip.length !== desiredLegs) {
                return;
            }

            if (currentTrip.length === desiredLegs && startAirport === destinationAirport) {
                foundTrip = {
                    legs: currentTrip?.slice(0, -1).map((icao, index) => ({ start: icao, end: currentTrip[index + 1] })),
                    destination: startAirport
                };
                return;
            }

            if (currentTrip.length >= desiredLegs || foundTrip) {
                return;
            }

            const destinations = airports[startAirport]?.destinations?.slice();
            if (!destinations) {
                return;
            }
            shuffleArray(destinations);

            for (const destination of destinations) {
                if (!airports?.[startAirport]?.aircrafts?.includes(aircraftType) ||
                    !airports?.[destination.icao]?.aircrafts.includes(aircraftType)) {
                    continue;
                }

                const legTime = FilterUtils.convertTimeToHours(destination.time);
                if (legTime > maxLegTime) {
                    continue;
                }

                dfs(destination.icao, currentTrip?.slice());
            }
        }

        dfs(startAirport, []);
        return { trip: foundTrip, aircraftType };

        function shuffleArray(array: any[]) {
            // Fisher-Yates Shuffle Implementation
            for (let i = array?.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
        }
    }


    private processData(data: Route[]): Record<string, Airport> {
        const airports: Record<string, Airport> = {};

        for (const base of data) {
            airports[base?.icao] = {
                name: base?.name,
                destinations: base?.destinations?.map(dest => ({ icao: dest.icao, time: dest.time })),
                aircrafts: base?.aircrafts
            };
        }
        return airports;
    }
}
