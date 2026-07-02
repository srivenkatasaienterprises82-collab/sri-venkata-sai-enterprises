import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { toOffer, toOffers, toBanner, toBanners, toGallery, toGalleries } from "./transform";
import type { SanityOffer, SanityBanner, SanityGallery } from "./types";

describe("Sanity transform mappers", () => {
  it("transforms SanityOffer successfully", () => {
    const mockSanityOffer: SanityOffer = {
      _id: "offer-1",
      title: "Festive Discount",
      badge: "Limited Time",
      subtitle: "10% off",
      discountText: "Flat ₹10k off",
      image: "https://cdn.sanity.io/img1.png",
      link: "/products",
      cta: "Claim Now",
      type: "bento",
    };

    const result = toOffer(mockSanityOffer);
    assert.equal(result.title, "Festive Discount");
    assert.equal(result.badge, "Limited Time");
    assert.equal(result.discountText, "Flat ₹10k off");
    assert.equal(result.image, "https://cdn.sanity.io/img1.png");
  });

  it("transforms SanityOffer array via toOffers", () => {
    const mockOffers: SanityOffer[] = [
      { _id: "o1", title: "Offer 1", badge: "New", subtitle: "", discountText: "₹5k", image: "", link: "/", cta: "Buy", type: "general" },
      { _id: "o2", title: "Offer 2", badge: "Hot", subtitle: "", discountText: "₹10k", image: "", link: "/", cta: "Buy", type: "flash" },
    ];
    const results = toOffers(mockOffers);
    assert.equal(results.length, 2);
    assert.equal(results[0].title, "Offer 1");
    assert.equal(results[1].title, "Offer 2");
  });

  it("transforms SanityBanner successfully", () => {
    const mockSanityBanner: SanityBanner = {
      _id: "banner-1",
      title: "Big Diwali Sale",
      subtitle: "Unmissable smartphone deals",
      badge: "Sale Live",
      cta: "Explore Now",
      backgroundColor: "#FF0000",
      image: "https://cdn.sanity.io/banner1.png",
      link: "/category/apple",
    };

    const result = toBanner(mockSanityBanner);
    assert.equal(result.title, "Big Diwali Sale");
    assert.equal(result.backgroundColor, "#FF0000");
    assert.equal(result.src, "https://cdn.sanity.io/banner1.png");
    assert.equal(result.href, "/category/apple");
    assert.equal(result.alt, "Big Diwali Sale");
  });

  it("transforms SanityBanner array via toBanners", () => {
    const mockBanners: SanityBanner[] = [
      { _id: "b1", title: "Banner 1", subtitle: "", badge: "", cta: "Shop", backgroundColor: "#FFF", image: "img1", link: "/" },
      { _id: "b2", title: "Banner 2", subtitle: "", badge: "", cta: "Shop", backgroundColor: "#FFF", image: "img2", link: "/" },
    ];
    const results = toBanners(mockBanners);
    assert.equal(results.length, 2);
    assert.equal(results[0].title, "Banner 1");
    assert.equal(results[1].title, "Banner 2");
  });

  it("transforms SanityGallery successfully", () => {
    const mockSanityGallery: SanityGallery = {
      _id: "gallery-1",
      image: "https://cdn.sanity.io/gal1.png",
      caption: "Our main counter",
    };

    const result = toGallery(mockSanityGallery);
    assert.equal(result.image, "https://cdn.sanity.io/gal1.png");
    assert.equal(result.caption, "Our main counter");
  });

  it("transforms SanityGallery array via toGalleries", () => {
    const mockGalleries: SanityGallery[] = [
      { _id: "g1", image: "img1", caption: "Photo 1" },
      { _id: "g2", image: "img2", caption: "Photo 2" },
    ];
    const results = toGalleries(mockGalleries);
    assert.equal(results.length, 2);
    assert.equal(results[0].caption, "Photo 1");
  });
});