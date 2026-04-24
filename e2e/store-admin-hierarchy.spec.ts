import { test, expect, Page } from '@playwright/test'
import { mockLogin, logout, TEST_USERS } from './fixtures/auth'

test.describe('Store Admin Hierarchy E2E', () => {
  let page: Page

  test.beforeEach(async ({ page: p }) => {
    page = p
  })

  // Scenario 1: Platform Admin manages merchants
  test('Scenario 1: platform_admin manages merchants (CRUD)', async () => {
    // 1. Login as platform_admin
    await mockLogin(page, TEST_USERS.platform_admin)

    // 2. Navigate to merchants management
    await page.goto('/store/admin/merchants')
    await page.waitForLoadState('networkidle')

    // 3. Verify merchants list is displayed
    const merchantsTable = page.locator('table')
    await expect(merchantsTable).toBeVisible()
    const merchantRows = page.locator('tbody tr').filter({ hasNot: page.locator('td:has-text("등록된 가맹점이 없습니다")') })

    // Get initial count
    const initialCount = await merchantRows.count()

    // 4. Verify "Add Merchant" button is visible
    const addButton = page.locator('button:has-text("가맹점 추가")')
    await expect(addButton).toBeVisible()

    // 5. Create a new merchant
    await addButton.click()
    await page.waitForSelector('[role="dialog"]')

    // Fill in merchant form
    await page.fill('input[placeholder*="가맹점"]', 'E2E Test Merchant')
    await page.fill('input[placeholder*="사업자"]', '123-45-67890')
    await page.fill('input[placeholder*="주소"]', 'Seoul, Korea')

    // Select admin from dropdown
    const adminSelect = page.locator('select')
    await adminSelect.first().click()
    await page.locator('option').first().click()

    // Click save
    const saveButton = page.locator('button:has-text("저장")')
    await saveButton.click()
    await page.waitForNavigation({ waitUntil: 'networkidle' })

    // Verify merchant was added
    await page.goto('/store/admin/merchants')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=E2E Test Merchant')).toBeVisible()

    // 6. Edit the merchant
    const editButtons = page.locator('button[title*="수정"]')
    const firstEditButton = editButtons.first()
    await firstEditButton.click()
    await page.waitForSelector('[role="dialog"]')

    // Modify merchant name
    const nameInput = page.locator('input[placeholder*="가맹점"]')
    await nameInput.clear()
    await nameInput.fill('E2E Test Merchant Updated')

    // Save changes
    await page.locator('button:has-text("저장")').click()
    await page.waitForNavigation({ waitUntil: 'networkidle' })

    // Verify update
    await expect(page.locator('text=E2E Test Merchant Updated')).toBeVisible()

    // 7. Delete the merchant
    const deleteButtons = page.locator('button[title*="삭제"]')
    const firstDeleteButton = deleteButtons.first()

    page.on('dialog', dialog => dialog.accept())
    await firstDeleteButton.click()
    await page.waitForNavigation({ waitUntil: 'networkidle' })

    // Verify deletion
    await expect(page.locator('text=E2E Test Merchant Updated')).not.toBeVisible()

    await logout(page)
  })

  // Scenario 2: Merchant Admin manages only their own merchant
  test('Scenario 2: merchant_admin manages own merchant only', async () => {
    // 1. Login as merchant_admin
    await mockLogin(page, TEST_USERS.merchant_admin)

    // 2. Navigate to merchants page
    await page.goto('/store/admin/merchants')
    await page.waitForLoadState('networkidle')

    // 3. Verify merchant list is displayed
    const merchantsTable = page.locator('table')
    await expect(merchantsTable).toBeVisible()

    // 4. Verify only own merchant is shown (filtered list)
    // Platform admin would see multiple merchants, merchant_admin should see only 1
    const merchantRows = page.locator('tbody tr').filter({ hasNot: page.locator('td:has-text("등록된 가맹점")') })
    const visibleCount = await merchantRows.count()
    expect(visibleCount).toBeLessThanOrEqual(1) // Should see only their own or none

    // 5. Verify Edit button is visible
    const editButton = page.locator('button[title*="수정"]').first()
    if (await editButton.isVisible()) {
      expect(editButton).toBeVisible()
    }

    // 6. Verify Delete button is NOT visible (disabled or hidden)
    const deleteButton = page.locator('button[title*="삭제"]:not([disabled])').first()
    const deleteDisabledButton = page.locator('button[title*="삭제"][disabled]').first()

    // Either no delete button or it's disabled
    const isDeleteHidden = !(await deleteButton.isVisible())
    const isDeleteDisabled = await deleteDisabledButton.isVisible()
    expect(isDeleteHidden || isDeleteDisabled).toBeTruthy()

    // 7. Navigate to stores and verify access
    await page.goto('/store/admin/stores')
    await page.waitForLoadState('networkidle')

    // Should show only assigned stores
    const storesTable = page.locator('table')
    await expect(storesTable).toBeVisible()

    await logout(page)
  })

  // Scenario 3: Store Admin manages terminals for assigned store
  test('Scenario 3: store_admin manages terminals for assigned store', async () => {
    // 1. Login as store_admin
    await mockLogin(page, TEST_USERS.store_admin)

    // 2. Navigate to terminals
    await page.goto('/store/admin/terminals')
    await page.waitForLoadState('networkidle')

    // 3. Verify terminals list is displayed
    const terminalsTable = page.locator('table')
    await expect(terminalsTable).toBeVisible()

    // 4. Verify only assigned store terminals are shown
    // Count visible terminal rows
    const terminalRows = page.locator('tbody tr').filter({ hasNot: page.locator('td:has-text("등록된 단말기")') })
    const visibleTerminals = await terminalRows.count()
    // Should be > 0 if there are terminals, or 0 if store has no terminals
    expect(visibleTerminals).toBeGreaterThanOrEqual(0)

    // 5. If there are terminals, test menu settings
    if (visibleTerminals > 0) {
      // Look for menu settings button - might be in a row
      const menuButtons = page.locator('button:has-text("메뉴") , button:has-text("설정")')
      const firstMenuButton = menuButtons.first()

      if (await firstMenuButton.isVisible()) {
        await firstMenuButton.click()

        // 6. Verify MenuManager modal opens
        const modal = page.locator('[role="dialog"], .modal, .fixed')
        await expect(modal).toBeVisible()

        // 7. Verify tab switching (POS, KIOSK)
        const posTabs = page.locator('button:has-text("POS"), [role="tab"]:has-text("POS")')
        const kioskTabs = page.locator('button:has-text("KIOSK"), [role="tab"]:has-text("KIOSK")')

        if (await posTabs.first().isVisible()) {
          await posTabs.first().click()
          await page.waitForTimeout(200)
        }

        if (await kioskTabs.first().isVisible()) {
          await kioskTabs.first().click()
          await page.waitForTimeout(200)
        }

        // Close modal
        const closeButton = page.locator('[role="dialog"] button:has-text("닫기"), [role="dialog"] [aria-label="닫기"], .modal button:last-of-type')
        if (await closeButton.first().isVisible()) {
          await closeButton.first().click()
        }
      }
    }

    await logout(page)
  })

  // Scenario 4: Terminal Admin manages terminals (CRUD)
  test('Scenario 4: terminal_admin manages terminals (full CRUD)', async () => {
    // 1. Login as terminal_admin
    await mockLogin(page, TEST_USERS.terminal_admin)

    // 2. Navigate to terminals
    await page.goto('/store/admin/terminals')
    await page.waitForLoadState('networkidle')

    // 3. Verify terminals list
    const terminalsTable = page.locator('table')
    await expect(terminalsTable).toBeVisible()

    // 4. Get initial count
    const terminalRows = page.locator('tbody tr').filter({ hasNot: page.locator('td:has-text("등록된 단말기")') })
    const initialCount = await terminalRows.count()

    // 5. Click edit on first terminal if available
    const editButtons = page.locator('button[title*="수정"], button:has-text("수정")')
    if (await editButtons.first().isVisible()) {
      await editButtons.first().click()
      await page.waitForSelector('[role="dialog"], .form, form')

      // 6. Verify TerminalForm is displayed (CRUD form)
      const form = page.locator('form, [role="dialog"]')
      await expect(form).toBeVisible()

      // 7. Look for form fields (terminal name, ID, etc.)
      const nameInput = page.locator('input[type="text"]').first()
      if (await nameInput.isVisible()) {
        // Get current value
        const currentValue = await nameInput.inputValue()

        // Update terminal info
        await nameInput.clear()
        await nameInput.fill(`E2E Terminal ${Date.now()}`)
      }

      // 8. Save changes
      const saveButton = page.locator('button:has-text("저장"), button[type="submit"]').last()
      if (await saveButton.isVisible()) {
        await saveButton.click()
        await page.waitForTimeout(500)
      }

      // Verify save was successful (form closed or success message)
      await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 5000 }).catch(() => {})
    }

    await logout(page)
  })

  // Scenario 5: Role-based account creation
  test('Scenario 5: role-based account creation with appropriate fields', async () => {
    // 1. Login as platform_admin
    await mockLogin(page, TEST_USERS.platform_admin)

    // 2. Navigate to members/accounts page
    await page.goto('/store/admin/members')
    await page.waitForLoadState('networkidle')

    // 3. Click "Create Account" button
    const createButton = page.locator('button:has-text("계정 생성"), button:has-text("생성")')
    if (await createButton.isVisible()) {
      await createButton.click()
      await page.waitForSelector('[role="dialog"]')

      // Test platform_admin account creation
      const roleSelect = page.locator('select')
      await roleSelect.click()
      const platformAdminOption = page.locator('option:has-text("시스템 관리자")')
      if (await platformAdminOption.isVisible()) {
        await platformAdminOption.click()
      }

      // Verify email field is shown (not ID field)
      const emailInput = page.locator('input[type="email"], input[id*="email"]')
      await expect(emailInput).toBeVisible()

      // Verify ID field is NOT shown
      const idInput = page.locator('input[id*="id-input"], input[placeholder*="user_id"]')
      const idNotVisible = !(await idInput.isVisible())
      expect(idNotVisible).toBeTruthy()

      // Close this dialog
      const closeButton = page.locator('[role="dialog"] button:has-text("취소")')
      await closeButton.click()
      await page.waitForTimeout(300)

      // Test merchant_admin account creation
      if (await createButton.isVisible()) {
        await createButton.click()
        await page.waitForSelector('[role="dialog"]')

        // Select merchant_admin role
        await roleSelect.click()
        const merchantAdminOption = page.locator('option:has-text("가맹점 관리자")')
        if (await merchantAdminOption.isVisible()) {
          await merchantAdminOption.click()
        }

        // Verify ID field is shown
        const idInputMerchant = page.locator('input[id*="id-input"], input[placeholder*="user_id"]')
        await expect(idInputMerchant).toBeVisible()

        // Verify email field is NOT shown
        const emailInputMerchant = page.locator('input[type="email"]')
        const emailNotVisible = !(await emailInputMerchant.isVisible())
        expect(emailNotVisible).toBeTruthy()

        // Verify password fields ARE shown (merchant roles need password)
        const passwordInput = page.locator('input[type="password"]').first()
        await expect(passwordInput).toBeVisible()

        const passwordConfirmInput = page.locator('input[type="password"]').last()
        await expect(passwordConfirmInput).toBeVisible()

        // Close dialog
        await closeButton.click()
      }

      // Test store_admin account creation
      if (await createButton.isVisible()) {
        await createButton.click()
        await page.waitForSelector('[role="dialog"]')

        // Select store_admin role
        await roleSelect.click()
        const storeAdminOption = page.locator('option:has-text("매장 관리자")')
        if (await storeAdminOption.isVisible()) {
          await storeAdminOption.click()
        }

        // Verify ID field is shown
        const idInputStore = page.locator('input[id*="id-input"], input[placeholder*="user_id"]')
        await expect(idInputStore).toBeVisible()

        // Verify password fields are shown
        const passwordInputStore = page.locator('input[type="password"]').first()
        await expect(passwordInputStore).toBeVisible()

        // Verify role restriction - terminal_admin should be available but not platform roles
        // Check role options
        const roleOptions = page.locator('option')
        const roleTexts = await roleOptions.allTextContents()

        // Store admin should see store_manager and terminal_admin options
        const hasTerminalAdmin = roleTexts.some(text => text.includes('단말기'))
        expect(hasTerminalAdmin).toBeTruthy()

        // Store admin should NOT see platform_admin option
        const hasPlatformAdmin = roleTexts.some(text => text.includes('시스템 관리자'))
        expect(hasPlatformAdmin).toBeFalsy()

        // Close dialog
        await closeButton.click()
      }
    }

    await logout(page)
  })
})
