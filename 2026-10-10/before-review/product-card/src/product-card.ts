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
      display: block;
      container-type: inline-size;
      container-name: card;
    }

    @container card (width < 280px) {
      article {
        display: flex;
        flex-direction: column;

        h3 {
          font-size: clamp(100cqi);
        }

        img {
          aspect-ratio: 16 / 9;
        }

        .desc {
          display: none;
        }
      }
    }

    @container card(width >=280px and width < 479px) {
      article {
        display: flex;
        flex-direction: column;

        .desc {
          display: block;
        }
      }
    }

    @container card (width >= 479px) {
      article {
        display: flex;
        flex-direction: row;

        img {
          aspect-ratio: 1 / 1;
          width: 40%;
        }
      }
    }
    /* TODO */
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
