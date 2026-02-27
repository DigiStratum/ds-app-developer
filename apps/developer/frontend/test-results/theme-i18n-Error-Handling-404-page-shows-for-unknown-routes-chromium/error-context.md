# Page snapshot

```yaml
- dialog "We use cookies to improve your experience" [ref=e1]:
  - generic [ref=e3]:
    - generic [ref=e4]:
      - heading "We use cookies to improve your experience" [level=2] [ref=e5]:
        - generic [ref=e6]: 🍪
        - text: We use cookies to improve your experience
      - paragraph [ref=e7]: We use essential cookies for authentication, plus optional cookies for personalization, analytics, and relevant ads.
    - generic [ref=e8]:
      - link "Learn more in our Privacy Policy" [ref=e9] [cursor=pointer]:
        - /url: https://www.digistratum.com/privacy
      - generic [ref=e10]:
        - button "Accept only necessary cookies for authentication" [ref=e11] [cursor=pointer]: Only Necessary
        - button "Accept all cookies including analytics and personalization" [ref=e12] [cursor=pointer]: Accept All
```