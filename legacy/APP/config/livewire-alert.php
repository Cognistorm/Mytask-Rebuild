<?php

/*
 * For more details about the configuration, see:
 * https://sweetalert2.github.io/#configuration
 */
return [

    'alert' => [
        'position' => 'top-right',
        'timer' => 3000,
        'toast' => true,
        'text' => null,
        'timerProgressBar' => true,
        'showCancelButton' => true,
        'showConfirmButton' => false,
    ],

    'confirm' => [
        'icon' => 'warning',
        'position' => 'center',
        'toast' => false,
        'timer' => null,
        'showConfirmButton' => true,
        'showCancelButton' => true,
        'cancelButtonText' => 'No',
        'confirmButtonColor' => '#3085d6',
        'cancelButtonColor' => '#d33',
    ],

    /**
     * Icons
     */
    'icons' => [

        // Success icon
        'success' => '<svg xmlns="http://www.w3.org/2000/svg" class="bg-green-100 h-6 mb-0.5 p-1 rounded-full text-green-500 w-6" width="20" height="20" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M5 12l5 5l10 -10"></path></svg>',

        // Error icon
        'error' => '<svg xmlns="http://www.w3.org/2000/svg" class="bg-red-100 h-6 mb-0.5 p-1 rounded-full text-red-500 w-6" width="20" height="20" viewBox="0 0 24 24" stroke-width="1.75" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M18 6l-12 12"></path><path d="M6 6l12 12"></path></svg>',

        // Cancel button
        'cancel_btn' => '<svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z"></path></svg>',

    ],

];
