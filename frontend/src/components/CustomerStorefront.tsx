import { ArrowRight, CakeSlice, ShoppingBag, Sparkles } from "lucide-react";
import { OrderShop } from "./OrderShop";
import { getProductPhoto } from "../data/productPhotos";

const heroPhoto = getProductPhoto("croissant");

export function CustomerStorefront() {
  return <main className="customer-site">
    <header className="customer-header">
      <a className="customer-brand" href="/?view=customer" aria-label="Flora Bakes storefront home"><span className="customer-brand-mark"><CakeSlice size={23}/></span><span>flora<span>bakes</span><small>BAKERY &amp; PATISSERIE</small></span></a>
      <nav className="customer-nav" aria-label="Customer navigation"><a href="#customer-menu">Our menu</a><a href="#customer-orders">Your orders</a><a href="#pickup-info">Pickup info</a><a className="button button-primary customer-nav-cta" href="#customer-menu"><ShoppingBag size={16}/> Order now</a></nav>
    </header>

    <section className="customer-hero">
      <img src={heroPhoto.url} alt="Freshly baked bakery treats"/>
      <div className="customer-hero-shade"/>
      <div className="customer-hero-copy"><span className="customer-eyebrow"><Sparkles size={15}/> BAKED FRESH, MADE WITH CARE</span><h1>A little joy,<br/><em>ready for pickup.</em></h1><p>Find something lovely in today’s menu. Place your pickup request online and we’ll confirm it with you.</p><a className="button customer-hero-button" href="#customer-menu">Explore the menu <ArrowRight size={16}/></a></div>
      <div className="customer-hero-note"><CakeSlice size={18}/><span><strong>Freshly baked</strong><small>Made for your day</small></span></div>
    </section>

    <section className="customer-intro"><span className="customer-eyebrow">A FLORA BAKES FAVOURITE</span><h2>Choose your treat.</h2><p>Browse the menu, add your favourites, and send us a pickup request.</p></section>
    <div className="customer-order-wrap"><OrderShop/></div>

    <footer className="customer-footer" id="pickup-info"><div><a className="customer-brand" href="/?view=customer"><span className="customer-brand-mark"><CakeSlice size={20}/></span><span>flora<span>bakes</span><small>BAKERY &amp; PATISSERIE</small></span></a><p>Good things are baking.</p><a href="/images/products/credits.html" target="_blank" rel="noreferrer">Product image credits</a></div><div><strong>Pickup orders</strong><p>Choose a preferred pickup time when you order. The bakery will confirm your request and payment directly with you. Payment is not collected online.</p></div><a href="#customer-menu">Back to menu ↑</a></footer>
  </main>;
}
