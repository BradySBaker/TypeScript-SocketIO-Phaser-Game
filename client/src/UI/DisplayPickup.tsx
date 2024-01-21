import React, { useEffect } from "react";

// import dropTypesAndCrafting from '../../../dropTypesAndCrafting';

const DisplayPickup: React.FC<{newPickup: {count: number, itemName: string}}> = ({newPickup}) => {

  useEffect(() => {
    if (!newPickup.itemName) {
      return;
    }
    let pickup = document.getElementById('pickup');

    pickup?.classList.remove('fade');

    // Force a reflow to restart the animation
    void pickup?.offsetWidth;

    pickup?.classList.add('fade');

  }, [newPickup]);

  return(
    <div id='pickup'>
      <div id='pickup-count'>
        + {newPickup.count}x
      </div>
      <div id='pickup-name'>
        {newPickup.itemName}
      </div>
    </div>
  )
}

export default DisplayPickup;