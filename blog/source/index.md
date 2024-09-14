---
title: Home
date: 2023-10-01 12:00:00
---

## Welcome to My Blog

This is the home page of my blog. Here you can write a brief introduction about your blog, your interests, or anything else you want to share.

### Recent Posts

Check out my latest posts below:

{% for post in site.posts %}
- [{{ post.title }}]({{ post.url }})
{% endfor %}
