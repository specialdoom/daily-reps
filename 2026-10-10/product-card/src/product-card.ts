import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("product-card")
export class ProductCard extends LitElement {
  @property() name = "";
  @property() price = "";
  @property() image = "";
  @property() description = "";

  static styles = css`
    :host {
      /* Custom elements are display: inline by default, and size containment
         (which container-type: inline-size turns on) has no effect on inline
         boxes. Without block the host has no width to query, so no @container
         rule below would ever match. */
      display: block;
      container-type: inline-size;
      container-name: card;
      /* Inline-size containment also means the host can't take its width from
         its content: in a shrink-wrapping parent (inline-block, flex, float)
         with no width it would collapse to 0. Give it a floor. */
      min-inline-size: 10rem;
    }

    :host([hidden]) {
      display: none;
    }

    /* The host can't be styled by a query on itself, so the layout lives on
       article. Everything outside the queries is shared by all three layouts. */
    article {
      display: flex;
    }

    img {
      display: block;
      object-fit: cover;
    }

    .body {
      display: grid;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem;
    }

    h3,
    p {
      margin: 0;
    }

    h3 {
      /* 16px up to 244px, 28px from 544px, 4% of the card's width in between */
      font-size: clamp(1rem, 0.39rem + 4cqi, 1.75rem);
    }

    slot[name="actions"] {
      display: flex;
      gap: 0.5rem;
    }

    @container card (width < 280px) {
      article {
        flex-direction: column;

        img {
          inline-size: 100%;
          aspect-ratio: 16 / 9;
        }

        .desc {
          display: none;
        }
      }
    }

    @container card (280px <= width < 480px) {
      article {
        flex-direction: column;

        img {
          inline-size: 100%;
          aspect-ratio: 16 / 9;
        }

        .body {
          grid-template-columns: 1fr auto;
        }

        h3,
        .desc {
          grid-column: 1 / -1;
        }
      }
    }

    @container card (width >= 480px) {
      article {
        flex-direction: row;

        img {
          flex: none;
          inline-size: 40%;
          aspect-ratio: 1 / 1;
          /* keep it square when the content is taller than the image */
          align-self: flex-start;
        }

        .body {
          flex: 1;
          min-inline-size: 0;
          grid-template-columns: 1fr auto;
          align-content: start;
        }

        h3,
        .desc {
          grid-column: 1 / -1;
        }
      }
    }
  `;

  render() {
    return html`
      <article>
        <img src=${this.image} alt="" />
        <div class="body">
          <h3>${this.name}</h3>
          <p class="desc">${this.description}</p>
          <p class="price">${this.price}</p>
          <slot name="actions"></slot>
        </div>
      </article>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "product-card": ProductCard;
  }
}
