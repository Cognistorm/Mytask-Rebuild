const colors = require("tailwindcss/colors");

function dynamicHsl(h, s, l) {
  return ({ opacityVariable, opacityValue }) => {
      if (opacityValue !== undefined) {
          	return `hsla(${h}, ${s}, ${l}, ${opacityValue})`
      }
      if (opacityVariable !== undefined) {
          	return `hsla(${h}, ${s}, ${l}, var(${opacityVariable}, 1))`
      }
      return `hsl(${h}, ${s}, ${l})`
  }
}

/** @type {import('tailwindcss').Config} */
module.exports = {

	safelist: [
        {
            pattern: /file-upload__input--*/,
        },
        {
            pattern: /switch-toggle--*/,
        },
        {
            pattern: /custom-select__button--*/,
        },
        {
            // For sizing, e.g. form-input--sm
            pattern: /form-input--*/,
        },
        {
            // For checkbox/radio sizing
            pattern: /form-choice--*/,
        },

        // For dark mode...
        {
            // quill editor classes
            pattern: /ql--*/,
        },
        "filepond--panel-root",
        "filepond--root",
		'sm:max-w-2xl'
	],

	presets: [
        require('./vendor/wireui/wireui/tailwind.config.js')
    ],

	content: [
		"./resources/**/*.blade.php",
		"./resources/views/components/bladewind/*.blade.php",
		"./resources/views/components/bladewind/button/*.blade.php",
		"./resources/views/vendor/Chatify/layouts/*.blade.php",
		"./resources/views/vendor/Chatify/pages/*.blade.php",
		"./resources/**/*.js",
		"./resources/**/*.vue",
		"./vendor/rawilk/laravel-form-components/src/**/*.php",
        "./vendor/rawilk/laravel-form-components/resources/**/*.php",
        "./vendor/rawilk/laravel-form-components/resources/js/*.js",
		'./vendor/wireui/wireui/resources/**/*.blade.php',
        './vendor/wireui/wireui/ts/**/*.ts',
        './vendor/wireui/wireui/src/View/**/*.php',
		'./vendor/wire-elements/modal/resources/views/*.blade.php',
		'./storage/framework/views/*.php',
		"./node_modules/flowbite/**/*.js"

	],
  	theme: {
		screens: {
			'sm': '640px',
			'md': '768px',
			'lg': '1024px',
			'xl': '1280px',
			'1xl': '1440px',
			'2xl': '1536px'
		},
		extend: {
			fontFamily: {
				'sans': ['BPG Nino Mtavruli Bold', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
			},
			colors: {
				primary: {
					DEFAULT: dynamicHsl('var(--color-primary-h)', 'var(--color-primary-s)', 'var(--color-primary-l)'),
					100: dynamicHsl('var(--color-primary-h)', 'var(--color-primary-s)', 'calc(var(--color-primary-l) + 30%)'),
					200: dynamicHsl('var(--color-primary-h)', 'var(--color-primary-s)', 'calc(var(--color-primary-l) + 24%)'),
					300: dynamicHsl('var(--color-primary-h)', 'var(--color-primary-s)', 'calc(var(--color-primary-l) + 18%)'),
					400: dynamicHsl('var(--color-primary-h)', 'var(--color-primary-s)', 'calc(var(--color-primary-l) + 12%)'),
					500: dynamicHsl('var(--color-primary-h)', 'var(--color-primary-s)', 'calc(var(--color-primary-l) + 6%)'),
					600: dynamicHsl('var(--color-primary-h)', 'var(--color-primary-s)', 'var(--color-primary-l)'),
					700: dynamicHsl('var(--color-primary-h)', 'var(--color-primary-s)', 'calc(var(--color-primary-l) - 6%)'),
					800: dynamicHsl('var(--color-primary-h)', 'var(--color-primary-s)', 'calc(var(--color-primary-l) - 12%)'),
					900: dynamicHsl('var(--color-primary-h)', 'var(--color-primary-s)', 'calc(var(--color-primary-l) - 18%)'),
				},
				slate: colors.slate,
			},
		}
  	},
	plugins: [
		require('@tailwindcss/forms'),
		require("tailwindcss-animate"),
		require('flowbite/plugin'),
		require('@tailwindcss/aspect-ratio'),
		require('@tailwindcss/typography'),
		require('tailwind-scrollbar'),
		require("./vendor/rawilk/laravel-form-components/resources/js/tailwind-plugins/switch-toggle"),
		require("./vendor/rawilk/laravel-form-components/resources/js/tailwind-plugins/dark-mode")(
            {
                quill   : true,
                filepond: true,
            }
        )
	],
}
