import { Destination, Route } from '../types/types';

const IMPORTANT_CALLSIGNS = ['EZY'];
export class FilterUtils {
    static getAllCallsigns(data: Route[]): string[] {
        const allCallsigns = new Set<string>(); // Use a Set to ensure unique callsigns

        data.forEach(route => {
            route?.destinations?.forEach((destination: Destination) => {
                destination?.callsigns?.split(',')?.forEach((callsign: string) => {
                    allCallsigns?.add(callsign.trim());
                });
            });
        });

        return Array.from(allCallsigns).sort((a, b) => {
            if (IMPORTANT_CALLSIGNS.includes(a) || IMPORTANT_CALLSIGNS.includes(b)) {
                if (IMPORTANT_CALLSIGNS.includes(a) && IMPORTANT_CALLSIGNS.includes(b)) {
                    return a <= b ? -1 : 1;
                }
                return IMPORTANT_CALLSIGNS.includes(a) ? -1 : 1;
            }
            return a <= b ? -1 : 1;
        }); // Convert Set back to array
    }

    static sortAlphabetically(a: string, b: string) {
        return a <= b ? -1 : 1;
    }

    static filterDataByCallsign(data: Route[], callsign: string) {
        const filteredRoutes: Route[] = [];

        data.forEach((route: Route) => {
            const filteredDestinations = route?.destinations?.filter(destination => {
                return destination.callsigns.includes(callsign);
            });

            if (filteredDestinations?.length > 0) {
                filteredRoutes.push({
                    ...route, // Copy the route properties
                    destinations: filteredDestinations
                });
            }
        });

        return filteredRoutes;
    }

    static filterDataByAircraft(data: Route[], aircraftType: string | null = null) {
        const filteredRoutes: Route[] = [];
        data.forEach(route => {
            const filteredDestinations = route?.destinations?.filter((destination) => {
                if (aircraftType === null) {
                    return true; // Keep all destinations if aircraftType is null
                } else {
                    return destination.types.split(',').some((aircraft) => aircraft === aircraftType);
                }
            });

            if (filteredDestinations?.length > 0) {
                filteredRoutes.push({
                    ...route,
                    destinations: filteredDestinations
                });
            }
        });

        return filteredRoutes;
    }

    static filterDataByHours(data :Route[], hoursLimit: number) {
        const filteredRoutes: Route[] = [];
        data.forEach(route => {
            const filteredDestinations = route?.destinations?.filter((destination) => {
                    return FilterUtils.convertTimeToHours(destination.time) <= hoursLimit;
            });

            if (filteredDestinations?.length > 0) {
                filteredRoutes.push({
                    ...route,
                    destinations: filteredDestinations
                });
            }
        });

        return filteredRoutes;
    }

    static convertTimeToHours(timeString: string): number {
        const [hoursStr, minutesStr, secondsStr] = timeString.split(':');
        const hours = parseFloat(hoursStr);
        const minutes = parseFloat(minutesStr) / 60;
        const seconds = parseFloat(secondsStr) / 3600;

        return hours + minutes + seconds;
    }
}
