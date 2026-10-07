// slugify = legacy Laravel Str::slug (ADR-006 §8); expectations are live mytask.ge slugs. uidSlug = legacy gig slug
// `substr(Str::slug(title.ka), 0, 138) . "-" . uid` (legacy/APP/app/Livewire/Main/Create/CreateComponent.php:676).
import { describe, expect, it } from 'vitest';
import { newPublicUid, slugify, uidSlug } from '../src/platform/slug';

describe('slugify', () => {
  it.each([
    ['პროდუქტის სარეკლამო ვიზუალების შექმნა', 'produqtis-sareklamo-vizualebis-sheqmna'],
    ['ვებ საიტის აწყობა', 'veb-saitis-atsyoba'],
    ['დაზიანებული ფოტოების აღდგენა', 'dazianebuli-fotoebis-aghdgena'],
    ['სარეკლამო ვიდეოების მონტაჟი', 'sareklamo-videoebis-montazhi'],
    ['მომხმარებელთა მხარდაჭერის', 'momkhmarebelta-mkhardacheris'],
    ['პროგრამული უზრუნველყოფის', 'programuli-uzrunvelyofis'],
    ['ძალა ჯადო ჰო ჩაი', 'dzala-jado-ho-chai'],
    ['ბრენდინგი/ლოგოს დიზაინი', 'brendingilogos-dizaini'],
    ['Python-ით და Flask-ით', 'python-it-da-flask-it'],
    ['Full Stack  Developer', 'full-stack-developer'],
    ['UI_UX design', 'ui-ux-design'],
    ['Café Crème', 'cafe-creme'],
    ['  --Logo--  ', 'logo'],
    ['ᲚᲝᲒᲝ', 'logo'],
    ['😀', ''],
  ])('%s → %s', (input, slug) => {
    expect(slugify(input)).toBe(slug);
  });
});

describe('public uid and {slug}-{uid}', () => {
  it('makes 20 uppercase hex uids, different each time', () => {
    const a = newPublicUid();
    expect(a).toMatch(/^[0-9A-F]{20}$/);
    expect(newPublicUid()).not.toBe(a);
  });

  it('joins the slug of the Georgian title and the uid (spec 04 AC-33, R-5.9)', () => {
    expect(uidSlug('Logo დიზაინი Photoshop-ში', '0A1B2C3D4E5F60718293')).toBe(
      'logo-dizaini-photoshop-shi-0A1B2C3D4E5F60718293',
    );
  });

  it('cuts the slug to 138 characters as legacy did, so the uid is always last', () => {
    const slug = uidSlug('ა'.repeat(200), 'ABCDEF0123456789ABCD');
    expect(slug).toBe(`${'a'.repeat(138)}-ABCDEF0123456789ABCD`);
    expect(slug.length).toBeLessThanOrEqual(160);
  });
});
