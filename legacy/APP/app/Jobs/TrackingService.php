<?php

namespace App\Jobs;

use App\Models\TrackerAgent;
use App\Models\TrackerDevice;
use App\Models\TrackerDomain;
use App\Models\TrackerGeoip;
use App\Models\TrackerLanguage;
use App\Models\TrackerReferer;
use App\Models\TrackerRefererSearchTerm;
use App\Models\TrackerSession;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Jenssegers\Agent\Agent;
use Snowplow\RefererParser\Parser;

class TrackingService implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public $ip_address,
        public $user_agent,
        public $referer_url,
        public $user_id,
        public $accept_languages
    ) {}

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {

            // Get geolocation
            $geolocation = $this->geolocation();

            // Get agent details
            $agent = $this->agent();

            // Get device
            $device = $this->device();

            // Get device languages
            $languages = $this->languages();

            // Get domain
            $domain = $this->domain();

            // Check if robot
            $robot = $this->robot();

            // Get referrer details
            if ($domain) {

                // Save referer
                $referer = $this->referer($domain);

            } else {

                // No referer
                $referer = null;

            }

            // Save session
            $tracker = new TrackerSession;
            $tracker->uuid = Str::uuid()->toString();
            $tracker->user_id = $this->user_id;
            $tracker->device_id = $device;
            $tracker->agent_id = $agent;
            $tracker->referer_id = $referer;
            $tracker->language_id = $languages;
            $tracker->geoip_id = $geolocation;
            $tracker->client_ip = $this->ip_address;
            $tracker->is_robot = $robot;
            $tracker->save();

        } catch (\Throwable $th) {
            throw $th;
        }
    }

    /**
     * Get geolocation data
     */
    private function geolocation(): mixed
    {
        try {

            // Get token for findip.net
            $token = config('findip.key');

            // Set url for request
            $url = "https://api.findip.net/{$this->ip_address}/?token={$token}";

            // Send request to get geo location data
            $response = Http::acceptJson()->get($url)->json();

            // Check if there are any data
            if (is_array($response)) {

                // Set data
                $data = [
                    'city' => isset($response['city']['names']['en']) ? Str::of($response['city']['names']['en'])->substr(0, 50)->toString() : null,
                    'country_name' => isset($response['country']['names']['en']) ? Str::of($response['country']['names']['en'])->substr(0, 100)->toString() : null,
                    'country_code' => isset($response['country']['iso_code']) ? Str::of($response['country']['iso_code'])->substr(0, 2)->toString() : null,
                    'timezone' => isset($response['location']['time_zone']) ? Str::of($response['location']['time_zone'])->substr(0, 20)->toString() : null,
                    'continent_name' => isset($response['continent']['names']['en']) ? Str::of($response['continent']['names']['en'])->substr(0, 100)->toString() : null,
                    'continent_code' => isset($response['continent']['code']) ? Str::of($response['continent']['code'])->substr(0, 2)->toString() : null,
                    'latitude' => isset($response['location']['latitude']) ? $response['location']['latitude'] : null,
                    'longitude' => isset($response['location']['longitude']) ? $response['location']['longitude'] : null,
                ];

                // Save to database
                $tracker_geoip = TrackerGeoip::firstOrCreate([
                    'latitude' => $data['latitude'],
                    'longitude' => $data['longitude'],
                    'country_name' => $data['country_name'],
                    'country_code' => $data['country_code'],
                    'city' => $data['city'],
                    'continent_name' => $data['continent_name'],
                    'continent_code' => $data['continent_code'],
                    'timezone' => $data['timezone'],
                ]);

                // Return geoip id
                return $tracker_geoip->id;

            } else {

                // Unable to get any data
                return null;

            }

        } catch (\Throwable $th) {

            // Something went wrong
            return null;

        }
    }

    /**
     * Parse user agent
     */
    private function agent(): mixed
    {
        try {

            // Parse agent
            $agent = new Agent;

            // Set user agent
            $agent->setUserAgent($this->user_agent);

            // Get browser
            $browser = $agent->browser();

            // Get browser version
            $version = $agent->version($browser);

            // Set data
            $data = [
                'name' => $this->user_agent,
                'name_hash' => hash('sha256', $this->user_agent),
                'browser' => $browser,
                'browser_version' => $version ? $version : null,
            ];

            // Save agent
            $tracker_agent = TrackerAgent::firstOrCreate(
                [
                    'name_hash' => $data['name_hash'],
                ],
                [
                    'name' => $data['name'],
                    'browser' => $data['browser'],
                    'browser_version' => $data['browser_version'],
                ]
            );

            // Return id
            return $tracker_agent->id;

        } catch (\Throwable $th) {

            // Something went wrong
            return null;

        }
    }

    /**
     * Get device details
     */
    private function device(): mixed
    {
        try {

            // Parse agent
            $agent = new Agent;

            // Set user agent
            $agent->setUserAgent($this->user_agent);

            // Get platform name
            $platform = $agent->platform();

            // Get platform device
            $version = str_replace('_', '.', $agent->version($platform));

            // Set default device kind
            $kind = 'unavailable';

            // Check current device kind
            if ($agent->isTablet()) {
                $kind = 'Tablet';
            } elseif ($agent->isPhone() || $agent->isMobile()) {
                $kind = 'Phone';
            } elseif ($agent->isComputer() || $agent->isDesktop()) {
                $kind = 'Computer';
            }

            // Get device model
            $model = $agent->device();

            // Check if mobile
            $is_mobile = $agent->isPhone() || $agent->isMobile() ? true : false;

            // Set data
            $data = [
                'kind' => $kind,
                'model' => $model ? $model : null,
                'platform' => $platform,
                'platform_version' => $version ? $version : null,
                'is_mobile' => $is_mobile,
            ];

            // Save device
            $tracker_device = TrackerDevice::firstOrCreate([
                'kind' => $data['kind'],
                'model' => $data['model'],
                'platform' => $data['platform'],
                'platform_version' => $data['platform_version'],
                'is_mobile' => $data['is_mobile'],
            ]);

            // Return id
            return $tracker_device->id;

        } catch (\Throwable $th) {

            // Something went wrong
            return null;

        }
    }

    /**
     * Get languages
     */
    private function languages(): mixed
    {
        try {

            // Parse agent
            $agent = new Agent;

            // Set user agent
            $agent->setUserAgent($this->user_agent);

            // Get languages
            $languages = $agent->languages($this->accept_languages);

            // Set preferred languages
            $preference = count($languages) ? $languages[0] : 'en';

            // Set languages range
            $language_range = count($languages) ? implode(',', $languages) : null;
            $language_range = Str::of($language_range)->substr(0, 180)->toString();

            // Save data
            $tracker_language = TrackerLanguage::firstOrCreate([
                'preference' => $preference,
                'language_range' => ! empty($language_range) ? $language_range : null,
            ]);

            // Return id
            return $tracker_language->id;

        } catch (\Throwable $th) {

            // Something went wrong
            return null;

        }
    }

    /**
     * Get referred domain details
     */
    private function domain(): mixed
    {
        try {

            // Check if the referer is a valid url
            if (Str::isUrl($this->referer_url)) {

                // Parse url
                $parse = parse_url($this->referer_url);

                // Save domain
                if (isset($parse['host'])) {

                    // Save
                    $tracker_domain = TrackerDomain::firstOrCreate([
                        'name' => Str::of($parse['host'])->substr(0, 160)->toString(),
                    ]);

                    // Return id
                    return $tracker_domain->id;

                } else {

                    // Not found
                    return null;

                }

            } else {

                // Not a valid url
                return null;

            }

        } catch (\Throwable $th) {

            // Something went wrong
            return null;

        }
    }

    /**
     * Get referer details
     */
    private function referer($domain_id): mixed
    {
        try {

            // Initialize parser
            $parser = new Parser;

            // Set referer
            $parsed = $parser->parse($this->referer_url);

            // Set attributes
            $attributes = [
                'medium' => null,
                'source' => null,
                'search_terms_hash' => null,
            ];

            // Check if url parsed
            if ($parsed->isKnown()) {

                // Set medium
                $attributes['medium'] = Str::of($parsed->getMedium())->substr(0, 160)->toString();

                // Set source
                $attributes['source'] = Str::of($parsed->getSource())->substr(0, 160)->toString();

                // Set search term hash
                $attributes['search_terms_hash'] = ! empty($parsed->getSearchTerm()) ? sha1($parsed->getSearchTerm()) : null;

            }

            // Save referer
            $tracker_referer = TrackerReferer::firstOrCreate([
                'domain_id' => $domain_id,
                'url' => Str::of($this->referer_url)->substr(0, 180)->toString(),
                'medium' => $attributes['medium'],
                'source' => $attributes['source'],
                'search_terms_hash' => $attributes['search_terms_hash'],
            ]);

            // Loop through search terms
            foreach (explode(' ', $parsed->getSearchTerm()) as $term) {

                // Term must not be empty
                if (! empty($term)) {

                    // Save term
                    TrackerRefererSearchTerm::firstOrCreate([
                        'referer_id' => $tracker_referer->id,
                        'search_term' => Str::of(clean($term))->substr(0, 100)->toString(),
                    ]);

                }

            }

            // Return referer id
            return $tracker_referer->id;

        } catch (\Throwable $th) {

            // Something went wrong
            return null;

        }
    }

    /**
     * Detect robot
     */
    private function robot(): bool
    {
        try {

            // Parse agent
            $agent = new Agent;

            // Set user agent
            $agent->setUserAgent($this->user_agent);

            // Return true of it is a robot
            return $agent->isRobot();

        } catch (\Throwable $th) {

            // Something went wrong
            return false;

        }
    }
}
