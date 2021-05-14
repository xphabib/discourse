import { createWidget } from "discourse/widgets/widget";
import hbs from "discourse/widgets/hbs-compiler";

createWidget("error-state", {
  tagName: "div.error-state",
  template: hbs`
    <div class="face">:(</div>
    <div class="reason">Error</div>
    <div class="desc">
      Internal Server Error
    </div>
  `,
});
