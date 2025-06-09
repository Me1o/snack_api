export class Post {
  id: string = '';
  title: string = '';
  text: string = '';
  imageUrl: string = '';
  source: string = '';
  link: string = '';
  country: string = '';
  category: postCategory[] = [];
  tweeted: boolean = false;
  createdAt: string = '';
  updatedAt: string = '';
}

export enum postCategory {
  Politics = 'Politics',
  Sports = 'Sports',
  Culture = 'Culture',
  Economics = 'Economics',
  Entertainment = 'Entertainment',
  Science = 'Science',
  Business = 'Business',
  Technology = 'Technology',
  Legal = 'Legal',
  General = 'General',
}
