<MyIcon name="home" />
```

## Security notes

- Icon upload/edit/delete sirf Admin Panel se login karके hi ho sakta hai —
  backend har request par token verify karta hai.
- `SUPABASE_SECRET_KEY` aur `SESSION_SECRET` kabhi bhi frontend code me nahi
  hain, sirf server-side environment variables me hain.
- Duplicate icon naam automatically reject ho jाते hain.
