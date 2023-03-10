export default class Player {
    constructor(current_song, next_song, access_token) {
        this.current_song = current_song;
        this.next_song = next_song;
        this.access_token = access_token;

        this.playback_state = null;
        this.analysis_array = null;
        this.device_id = null;
        this.jump_ms = null;
        this.landing_ms = null;

        this.jumped = false;
    }
    // gets a current state and queue from the Spotify API and returns the time it took
    async gatherData() {

        const playbackStateFetch = await getPlaybackState(this.access_token);

        this.playback_state = playbackStateFetch.playback_state;
        this.device_id = this.playback_state.device.id;
        console.log(this.playback_state);

        const state_fetch_ms = playbackStateFetch.fetch_time;

        const analysisFetch = await getAnalysis(this.access_token, this.current_song, this.next_song);
        this.analysis_array = analysisFetch.analysis_array;

        // testing
        console.log(this.analysis_array);

        const analysis_fetch_ms = analysisFetch.fetch_time;

        return {
            'state_fetch_ms': state_fetch_ms,
            'analysis_fetch_ms': analysis_fetch_ms
        };

    }
    setTimestamps() {
        // pick a target segment from the array (random for now)
        const target_timestamp = this.analysis_array[Math.floor(Math.random() * this.analysis_array.length)];

        // set target/jump ms values
        this.jump_ms = target_timestamp[0];
        this.landing_ms = target_timestamp[1];

        console.log(`jumping at ${this.jump_ms}ms and landing at ${this.landing_ms}ms`);
    }
    // update the HTML content of the player to reflect the current state of the playback queue
    updateStage() {
        document.getElementById('song-1-img').src = `${this.current_song.album.images[1].url}`;
        document.getElementById('song-2-img').src = `${this.next_song.album.images[1].url}`;
        document.getElementById('player-header').innerText = `Now Playing ${this.current_song.name}`;

    }

    selectNewJump() {
        const target_timestamp = this.analysis_array[Math.floor(Math.random() * this.analysis_array.length)];
        this.jump_ms = target_timestamp[0];

    };

    async skipToNext() {

        console.log(`skipping from ${this.current_song.name} to ${this.next_song.name}`);
        this.jumped = true;

        fetch(`https://api.spotify.com/v1/me/player/play${this.device_id && `?device_id=${this.device_id}`}`, {
            method: "PUT",
            body: JSON.stringify({ "uris": [`spotify:track:${this.next_song.id}`], "position_ms": this.landing_ms }),
            headers: {
                'Authorization': `Bearer ${this.access_token}`
            }
        }).catch(e => console.error(e));

    };

};

const getPlaybackState = async (access_token) => {

    const req_start_time = Date.now();

    const result = await fetch(`https://api.spotify.com/v1/me/player`, {
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + access_token }
    });

    const data = await result.json();
    const fetch_time = Date.now() - req_start_time;

    return {
        'playback_state': data,
        'fetch_time': fetch_time
    }

};

const getAnalysis = async (access_token, current_song, next_song) => {

    return new Promise((resolve, reject) => {

        $.ajax({
            url: '/get-analysis',
            data: {
                'access_token': access_token,
                'current_song_id': current_song.id,
                'next_song_id': next_song.id
            }
        }).done((response) => {
            const analysis_array = response.analysis_array;
            const fetch_time = ((Date.now() - response.timestamp) + response.fulfillment_time);

            resolve({
                'analysis_array': analysis_array,
                'fetch_time': fetch_time
            });
        });

    });
};