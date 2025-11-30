import React from 'react';
import Link from 'next/link';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  publishedAt: string;
  category: string;
  readTime: number;
  imageUrl?: string;
  tags: string[];
}

const mockBlogPosts: BlogPost[] = [
  {
    id: '1',
    title: 'The Ultimate Guide to Fine Dining Etiquette',
    excerpt: 'Master the art of fine dining with these essential etiquette tips that will make you feel confident at any upscale restaurant.',
    content: '',
    author: 'Sarah Johnson',
    publishedAt: '2025-01-15',
    category: 'Dining Tips',
    readTime: 8,
    tags: ['etiquette', 'fine dining', 'tips']
  },
  {
    id: '2',
    title: 'Top 10 Restaurant Trends to Watch in 2025',
    excerpt: 'From sustainable dining to AI-powered experiences, discover the trends shaping the restaurant industry this year.',
    content: '',
    author: 'Michael Chen',
    publishedAt: '2025-01-12',
    category: 'Industry News',
    readTime: 6,
    tags: ['trends', 'technology', 'sustainability']
  },
  {
    id: '3',
    title: 'How to Choose the Perfect Restaurant for Any Occasion',
    excerpt: 'Whether it\'s a first date, business dinner, or family celebration, learn how to pick the ideal venue for every situation.',
    content: '',
    author: 'Emma Rodriguez',
    publishedAt: '2025-01-10',
    category: 'Dining Tips',
    readTime: 5,
    tags: ['occasion', 'selection', 'planning']
  },
  {
    id: '4',
    title: 'Behind the Scenes: A Day in the Life of a Chef',
    excerpt: 'Go behind the kitchen doors and discover what it takes to run a successful restaurant kitchen.',
    content: '',
    author: 'Chef Robert Taylor',
    publishedAt: '2025-01-08',
    category: 'Chef Stories',
    readTime: 10,
    tags: ['chef', 'kitchen', 'restaurant life']
  },
  {
    id: '5',
    title: 'Wine Pairing 101: Enhance Your Dining Experience',
    excerpt: 'Learn the basics of wine pairing to elevate your meals and impress your dining companions.',
    content: '',
    author: 'Sophia Williams',
    publishedAt: '2025-01-05',
    category: 'Wine & Beverages',
    readTime: 7,
    tags: ['wine', 'pairing', 'beverages']
  },
  {
    id: '6',
    title: 'The Rise of Plant-Based Fine Dining',
    excerpt: 'Explore how high-end restaurants are revolutionizing vegan and vegetarian cuisine.',
    content: '',
    author: 'David Kim',
    publishedAt: '2025-01-03',
    category: 'Food Trends',
    readTime: 6,
    tags: ['vegan', 'vegetarian', 'plant-based']
  }
];

const categories = [
  'All Posts',
  'Dining Tips',
  'Industry News',
  'Chef Stories',
  'Wine & Beverages',
  'Food Trends'
];

const featuredPost = mockBlogPosts[0];
const recentPosts = mockBlogPosts.slice(1);

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">OpenTable Clone Blog</h1>
          <p className="text-lg text-gray-600">
            Discover dining tips, restaurant news, and culinary insights
          </p>
        </div>

        {/* Featured Post */}
        <section className="mb-12">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="md:flex">
              <div className="md:w-1/2">
                <div className="h-64 md:h-full bg-gray-300 flex items-center justify-center">
                  <span className="text-gray-500 text-4xl">🍽️</span>
                </div>
              </div>
              <div className="md:w-1/2 p-8">
                <div className="flex items-center mb-4">
                  <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                    Featured
                  </span>
                  <span className="ml-3 text-sm text-gray-600">{featuredPost.category}</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  <Link href={`/blog/${featuredPost.id}`} className="hover:text-red-600 transition-colors">
                    {featuredPost.title}
                  </Link>
                </h2>
                <p className="text-gray-600 mb-4">{featuredPost.excerpt}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center text-sm text-gray-500">
                    <span>{featuredPost.author}</span>
                    <span className="mx-2">•</span>
                    <span>{new Date(featuredPost.publishedAt).toLocaleDateString()}</span>
                    <span className="mx-2">•</span>
                    <span>{featuredPost.readTime} min read</span>
                  </div>
                  <Link
                    href={`/blog/${featuredPost.id}`}
                    className="text-red-600 hover:text-red-700 font-medium text-sm"
                  >
                    Read More →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="mb-8">
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map((category) => (
              <button
                key={category}
                className="px-4 py-2 bg-white rounded-full border border-gray-300 hover:border-red-600 hover:text-red-600 transition-colors text-sm font-medium"
              >
                {category}
              </button>
            ))}
          </div>
        </section>

        {/* Recent Posts Grid */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6">Recent Posts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentPosts.map((post) => (
              <article key={post.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden">
                <div className="h-48 bg-gray-300 flex items-center justify-center">
                  <span className="text-gray-500 text-3xl">📝</span>
                </div>
                <div className="p-6">
                  <div className="flex items-center mb-3">
                    <span className="text-xs text-red-600 font-medium">{post.category}</span>
                    <span className="mx-2 text-gray-300">•</span>
                    <span className="text-xs text-gray-500">{post.readTime} min read</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    <Link href={`/blog/${post.id}`} className="hover:text-red-600 transition-colors">
                      {post.title}
                    </Link>
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">{post.excerpt}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-xs text-gray-500">
                      <span>{post.author}</span>
                      <span className="mx-1">•</span>
                      <span>{new Date(post.publishedAt).toLocaleDateString()}</span>
                    </div>
                    <Link
                      href={`/blog/${post.id}`}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Read →
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Newsletter Signup */}
        <section className="bg-white rounded-lg shadow-sm p-8 text-center mb-12">
          <h2 className="text-2xl font-semibold mb-4">Stay Updated</h2>
          <p className="text-gray-600 mb-6">
            Subscribe to our blog newsletter and never miss the latest dining insights and restaurant news.
          </p>
          <div className="max-w-md mx-auto flex gap-2">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
            />
            <button className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors">
              Subscribe
            </button>
          </div>
        </section>

        {/* Popular Tags */}
        <section className="bg-white rounded-lg shadow-sm p-8">
          <h2 className="text-lg font-semibold mb-4">Popular Tags</h2>
          <div className="flex flex-wrap gap-2">
            {Array.from(new Set(mockBlogPosts.flatMap(post => post.tags))).map((tag) => (
              <Link
                key={tag}
                href={`/blog?tag=${tag}`}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-red-100 hover:text-red-700 transition-colors"
              >
                #{tag}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}