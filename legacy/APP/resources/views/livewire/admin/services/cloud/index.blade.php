<div class="mx-auto w-full max-w-5xl">
	<div class="relative w-full">

		{{-- Empty state --}}
		<div class="flex w-full flex-col">
			<div class="bg-slate-100 flex h-24 items-center justify-center mx-auto rounded-full text-4xl text-slate-400 w-24 dark:bg-zinc-800 dark:text-zinc-400">
				<i class="ph-duotone ph-cloud-arrow-up"></i>
			</div>
			<div class="mx-auto w-full max-w-md text-center">
				<p class="font-bold mt-4 text-base text-slate-600 dark:text-zinc-200 tracking-wide" tag="h2">
					@lang('dashboard.t_cloud_storage')
				</p>
				<p class="font-light mb-3 mt-1 text-slate-500 dark:text-zinc-400 text-sm">
					@lang('dashboard.t_cloud_storage_explain_txt')
				</p>
			</div>
		</div>

		{{-- Available services --}}
		<div class="mx-auto mt-6 grid w-full max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">

			{{-- Amazon S3 --}}
			<div class="card !border-slate-300 shadow-sm group hover:ring hover:ring-primary-600 hover:ring-opacity-30 dark:!border-zinc-700 dark:hover:ring-zinc-500 min-h-[9rem]">
				<a href="{{ admin_url('services/cloud/amazon') }}" class="block p-6">
					<div class="text-center">
						<img src="https://cdn.worldvectorlogo.com/logos/amazon-s3.svg" alt="Amazon S3" class="mb-4 block h-12 max-w-full mx-auto">
						<p class="bg-slate-50 -mx-6 absolute border-t bottom-0 border-slate-200 pb-2.5 pt-2 text-slate-500 text-xs+ tracking-wide w-full rounded-b-xl dark:bg-zinc-900 dark:border-transparent dark:text-zinc-400">
							Amazon S3
						</p>
					</div>
				</a>
			</div>

			{{-- Wasabi --}}
			<div class="card !border-slate-300 shadow-sm group hover:ring hover:ring-primary-600 hover:ring-opacity-30 dark:!border-zinc-700 dark:hover:ring-zinc-500 min-h-[9rem]">
				<a href="{{ admin_url('services/cloud/wasabi') }}" class="block p-6">
					<div class="text-center">
						<img src="https://www.vectorlogo.zone/logos/wasabi/wasabi-icon.svg" alt="Wasabi" class="mb-4 block h-12 max-w-full mx-auto">
						<p class="bg-slate-50 -mx-6 absolute border-t bottom-0 border-slate-200 pb-2.5 pt-2 text-slate-500 text-xs+ tracking-wide w-full rounded-b-xl dark:bg-zinc-900 dark:border-transparent dark:text-zinc-400">
							Wasabi
						</p>
					</div>
				</a>
			</div>

			{{-- Cloudinary --}}
			<div class="card !border-slate-300 shadow-sm group hover:ring hover:ring-primary-600 hover:ring-opacity-30 dark:!border-zinc-700 dark:hover:ring-zinc-500 min-h-[9rem]">
				<a href="{{ admin_url('services/cloud/cloudinary') }}" class="block p-6">
					<div class="text-center">
						<img src="https://cdn.worldvectorlogo.com/logos/cloudinary-1.svg" alt="Cloudinary" class="mb-4 block h-12 max-w-full mx-auto">
						<p class="bg-slate-50 -mx-6 absolute border-t bottom-0 border-slate-200 pb-2.5 pt-2 text-slate-500 text-xs+ tracking-wide w-full rounded-b-xl dark:bg-zinc-900 dark:border-transparent dark:text-zinc-400">
							Cloudinary
						</p>
					</div>
				</a>
			</div>

			{{-- Coming soon --}}
			<div class="min-h-[9rem] border-dashed border-2 rounded-xl flex flex-col justify-center items-center space-y-4 bg-slate-50 border-slate-200 dark:bg-zinc-800 dark:border-zinc-600">

				{{-- icon --}}
				<i class="ph-duotone ph-plus-circle text-3xl text-slate-400 dark:text-zinc-400"></i>

				{{-- text --}}
				<span class="text-xs+ font-normal text-slate-400 dark:text-zinc-200">@lang('dashboard.t_coming_soon')...</span>

			</div>
			
		</div>

	</div>
</div>