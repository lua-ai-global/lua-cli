export default class GetWeatherMain{
    constructor() {
    }

    async getWeather(city: string) {
        return { weather: "sunny", city: city };
    }
}