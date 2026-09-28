<form action="{{ route('wasabi') }}" method="post" enctype="multipart/form-data">
@csrf
<input type="file" name="file" class="form-control">
<input type="submit" class="btn btn-primary">
</form>