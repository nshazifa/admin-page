import { db, auth } from "./firebase-config.js";
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const content = document.getElementById("content");

// FETCH MENU ITEMS FROM FIRESTORE
async function fetchMenu() {
    const menuTable = document.getElementById("menuTableBody");
    if (!menuTable) return; // Prevent errors if the table doesn't exist yet

    menuTable.innerHTML = ""; // Clear table before loading new data

    const menuDocRef = doc(db, "Menu", "menuItems");
    const subcollections = ["burger-items", "pizza-items", "momos-items", "desert-items", "drinks-items"];

    for (const subcollection of subcollections) {
        const querySnapshot = await getDocs(collection(menuDocRef, subcollection));
        querySnapshot.forEach((docSnap) => {
            const item = docSnap.data();
            addItemToTable(docSnap.id, item, subcollection);
        });
    }
}

// ADD ITEM TO TABLE
function addItemToTable(id, item, category) {
    const menuTable = document.getElementById("menuTableBody");
    if (!menuTable) return;

    const row = document.createElement("tr");
    row.innerHTML = `
        <td><img src="${item.image}" width="50"></td>
        <td>${item.name}</td>
        <td>₹${item.price}</td>
        <td>${category}</td>
        <td>
            <button class="edit-btn" data-id="${id}" data-category="${category}" data-name="${item.name}" data-price="${item.price}" data-image="${item.image}">Edit</button>
            <button class="delete-btn" data-id="${id}" data-category="${category}">Delete</button>
        </td>
    `;
    menuTable.appendChild(row);
}

// ADD NEW ITEM
async function addItem(e) {
    e.preventDefault();

    const name = document.getElementById("itemName").value;
    const price = document.getElementById("itemPrice").value;
    const image = document.getElementById("itemImage").value;
    const category = document.getElementById("itemCategory").value;

    const newItemRef = doc(collection(doc(db, "Menu", "menuItems"), category));
    await setDoc(newItemRef, { name, price: Number(price), image });

    fetchMenu(); // Refresh table
    e.target.reset();
}

// DELETE ITEM WITH CONFIRMATION
document.addEventListener("click", async (e) => {
    if (e.target.classList.contains("delete-btn")) {
        const id = e.target.dataset.id;
        const category = e.target.dataset.category;

        const confirmDelete = confirm("Are you sure you want to delete this item?");
        if (!confirmDelete) return;

        await deleteDoc(doc(db, `Menu/menuItems/${category}/${id}`));
        fetchMenu(); // Refresh table
    }
});

// EDIT ITEM FUNCTIONALITY
document.addEventListener("click", async (e) => {
    if (e.target.classList.contains("edit-btn")) {
        const id = e.target.dataset.id;
        const category = e.target.dataset.category;
        const oldName = e.target.dataset.name;
        const oldPrice = e.target.dataset.price;
        const oldImage = e.target.dataset.image;

        const newName = prompt("Enter new name:", oldName);
        const newPrice = prompt("Enter new price:", oldPrice);
        const newImage = prompt("Enter new image URL:", oldImage);

        if (!newName || !newPrice || !newImage) return;

        const itemRef = doc(db, `Menu/menuItems/${category}/${id}`);
        await updateDoc(itemRef, { name: newName, price: Number(newPrice), image: newImage });

        fetchMenu(); // Refresh table
    }
});

// FUNCTIONS FOR LOADING DIFFERENT PAGES
function loadMenu() {
    content.innerHTML = `
        <h2>Modify Menu</h2>
        <p>View, edit, and delete Menu items</p>
        <table class="table">
            <thead>
                <tr>
                    <th>Image</th>
                    <th>Name</th>
                    <th>Price</th>
                    <th>Category</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody id="menuTableBody"></tbody>
        </table>
    `;
    fetchMenu();
}

function loadModifyMenu() {
    content.innerHTML = `
        <h2>Add to Menu</h2>
        <form id="addItemForm">
            <input type="text" id="itemName" placeholder="Item Name" required>
            <input type="number" id="itemPrice" placeholder="Price" required>
            <input type="text" id="itemImage" placeholder="Image URL" required>
            <select id="itemCategory">
                <option value="burger-items">Burger</option>
                <option value="pizza-items">Pizza</option>
                <option value="momos-items">Momos</option>
                <option value="desert-items">Desert</option>
                <option value="drinks-items">Drinks</option>
            </select>
            <button type="submit">Add Item</button>
        </form>
    `;
    document.getElementById("addItemForm").addEventListener("submit", addItem);
}

// MANAGE USERS
async function manageUsers() {
  const container = document.getElementById("ordersContainer");
  container.innerHTML = "<h2>Loading users and orders...</h2>";

  const usersRef = collection(db, "Users");
  const usersSnapshot = await getDocs(usersRef);

  let tableHTML = `
      <h2>Manage Users</h2>
      <table class="table">
          <thead>
              <tr>
                  <th>User ID</th>
                  <th>Email</th>
                  <th>Username</th>
                  <th>Actions</th>
              </tr>
          </thead>
          <tbody>`;

  for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      const userData = userDoc.data();

      const ordersRef = collection(db, `Users/${userId}/Orders`);
      const ordersSnapshot = await getDocs(ordersRef);
      const hasOrders = !ordersSnapshot.empty;

      tableHTML += `
          <tr>
              <td>${userId}</td>
              <td>${userData.email || "N/A"}</td>
              <td>${userData.username || "N/A"}</td>
              <td>
                  <button onclick="confirmDeleteUser('${userId}')">Delete</button>
                  ${hasOrders ? `<button onclick="viewUserOrders('${userId}', '${userData.username || "User"}')">View Orders</button>` : ""}
              </td>
          </tr>`;
  }

  tableHTML += "</tbody></table>";
  container.innerHTML = tableHTML;
}

function confirmDeleteUser(userId) {
  const confirmDelete = confirm("Are you sure you want to delete this user?");
  if (confirmDelete) {
      deleteUser(userId);
  }
}

async function deleteUser(userId) {
  try {
      await deleteDoc(doc(db, "Users", userId));
      alert("User deleted successfully.");
      manageUsers();
  } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to delete user.");
  }
}

async function viewUserOrders(userId, username) {
  const container = document.getElementById("ordersContainer");
  container.innerHTML = `<h2>Orders for ${username}</h2>`;

  const ordersRef = collection(db, `Users/${userId}/Orders`);
  const ordersSnapshot = await getDocs(ordersRef);

  if (ordersSnapshot.empty) {
      container.innerHTML += "<p>No orders found for this user.</p>";
      return;
  }

  let tableHTML = `
      <table class="table">
          <thead>
              <tr>
                  <th>User ID</th>
                  <th>Order ID</th>
                  <th>Delivery Details</th>
                  <th>Order Details</th>
                  <th>Manage Order</th>
              </tr>
          </thead>
          <tbody>`;

  for (const orderDoc of ordersSnapshot.docs) {
      const orderId = orderDoc.id;
      const orderData = orderDoc.data();

      const deliveryRef = doc(db, `Users/${userId}/Orders/${orderId}/DeliveryInfo/Details`);
      const deliverySnap = await getDoc(deliveryRef);
      const deliveryData = deliverySnap.exists() ? deliverySnap.data() : {};

      const orderItemsRef = collection(db, `Users/${userId}/Orders/${orderId}/OrderItems`);
      const orderItemsSnap = await getDocs(orderItemsRef);

      let deliveryDetails = `
          <strong>Address:</strong> ${deliveryData.address || "N/A"}<br>
          <strong>Phone:</strong> ${deliveryData.phone || "N/A"}<br>
          <strong>Payment:</strong> ${deliveryData.paymentMethod || "N/A"}`;

      let orderDetails = "";
      orderItemsSnap.forEach((itemDoc) => {
          const item = itemDoc.data();
          const total = (item.price || 0) * (item.quantity || 0);
          orderDetails += `
              ${item.name || "Item"} - Qty: ${item.quantity || 0}, Price: ₹${item.price || 0}, Total: ₹${total}<br>`;
      });

      tableHTML += `
          <tr>
              <td>${userId}</td>
              <td>${orderId}</td>
              <td>${deliveryDetails}</td>
              <td>${orderDetails}</td>
              <td>
                  <label for="statusSelect-${orderId}"><strong>Status:</strong></label><br>
                  <select id="statusSelect-${orderId}" onchange="confirmUpdateStatus('${userId}', '${orderId}', this.value)">
                      <option value="Pending" ${orderData.status === "Pending" ? "selected" : ""}>Pending</option>
                      <option value="Processing" ${orderData.status === "Processing" ? "selected" : ""}>Processing</option>
                      <option value="Completed" ${orderData.status === "Completed" ? "selected" : ""}>Completed</option>
                      <option value="Cancelled" ${orderData.status === "Cancelled" ? "selected" : ""}>Cancelled</option>
                  </select>
                  <br>
                  <button onclick="confirmDeleteOrder('${userId}', '${orderId}')">Delete Order</button>
              </td>
          </tr>`;
  }

  tableHTML += "</tbody></table>";
  container.innerHTML += tableHTML;
}

function confirmUpdateStatus(userId, orderId, newStatus) {
  const confirmChange = confirm(`Change order status to '${newStatus}'?`);
  if (confirmChange) {
      updateOrderStatus(userId, orderId, newStatus);
  }
}

async function updateOrderStatus(userId, orderId, newStatus) {
  try {
      const orderRef = doc(db, `Users/${userId}/Orders/${orderId}`);
      await updateDoc(orderRef, { status: newStatus });
      alert("Order status updated.");
      viewUserOrders(userId, "User");
  } catch (error) {
      console.error("Failed to update status:", error);
      alert("Error updating order status.");
  }
}

function confirmDeleteOrder(userId, orderId) {
  const confirmCancel = confirm("Are you sure you want to delete this order?");
  if (confirmCancel) {
      deleteOrder(userId, orderId);
  }
}

async function deleteOrder(userId, orderId) {
  try {
      await deleteDoc(doc(db, `Users/${userId}/Orders/${orderId}`));
      alert("Order deleted.");
      viewUserOrders(userId, "User");
  } catch (error) {
      console.error("Error deleting order:", error);
      alert("Failed to delete order.");
  }
}

window.manageUsers = manageUsers;
window.viewUserOrders = viewUserOrders;
window.deleteUser = deleteUser;
window.updateOrderStatus = updateOrderStatus;
window.deleteOrder = deleteOrder;
window.confirmUpdateStatus = confirmUpdateStatus;
window.confirmDeleteOrder = confirmDeleteOrder;

// Make the function globally accessible

window.loadMenu = loadMenu;
window.loadModifyMenu = loadModifyMenu;

// Styling for Tables
const styles = `
    .table {
        width: 100%;
        border-collapse: collapse;
    }
    .table th, .table td {
        padding: 12px;
        border: 1px solid #ddd;
        text-align: center;
    }
    .table th {
        background-color: #343a40;
        color: white;
    }
    .table tbody tr:nth-child(even) {
        background-color: #f2f2f2;
    }
    .table tbody tr:hover {
        background-color: #ddd;
    }
`;

const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

// Logout function
window.logout = function () {
    auth.signOut().then(() => {
        window.location.href = "index.html";
    }).catch(error => {
        console.error("Error signing out:", error);
    });
};

// Go to Customer Panel
window.goToCustomerPanel = function () {
    window.location.href = "product.html";
};
